import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { deleteObject, ref, uploadBytesResumable } from 'firebase/storage'

import { ADMIN_UID } from '@/admin/services/admin-auth.service'
import { db, storage } from '@/services/firebase/firebase'
import {
  TRAINING_COLLECTIONS,
  type TrainingCapture,
  type TrainingSession,
} from '@/data/training/training-dataset.types'
import { guessVehicleType } from '@/data/training/training-shots'
import type { PendingCapture } from './pending-store'

function toMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis()
  if (typeof value === 'number') return value
  return 0
}

export async function isDataCollector(uid: string): Promise<boolean> {
  if (uid === ADMIN_UID) return true
  const snap = await getDoc(doc(db, TRAINING_COLLECTIONS.collectors, uid))
  return snap.exists()
}

export interface CatalogModel {
  id: string
  label: string
  hasChain: boolean
  bodyType: string | null
}

export async function listCatalogModels(): Promise<CatalogModel[]> {
  const snap = await getDocs(collection(db, 'vehicleModels'))
  return snap.docs
    .map((d) => {
      const m = d.data()
      const label = [m.brand, m.series, m.trimName, m.modelYear ? `(${m.modelYear})` : '']
        .filter(Boolean)
        .join(' ')
      return { id: d.id, label, hasChain: !!m.hasChain, bodyType: (m.bodyType as string) ?? null }
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'zh-Hant'))
}

function toSession(id: string, data: Record<string, unknown>): TrainingSession {
  return {
    id,
    collectorUid: String(data.collectorUid ?? ''),
    vehicleModelId: (data.vehicleModelId as string | null) ?? null,
    vehicleModelLabel: String(data.vehicleModelLabel ?? ''),
    vehicleType:
      data.vehicleType === 'manual' || data.vehicleType === 'scooter'
        ? data.vehicleType
        : guessVehicleType(null, !!data.hasChain),
    hasChain: !!data.hasChain,
    notes: String(data.notes ?? ''),
    skippedShots: (data.skippedShots as Record<string, string>) ?? {},
    status: data.status === 'completed' ? 'completed' : 'open',
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  }
}

export async function createSession(
  input: Pick<
    TrainingSession,
    'collectorUid' | 'vehicleModelId' | 'vehicleModelLabel' | 'vehicleType' | 'hasChain' | 'notes'
  >,
): Promise<string> {
  const ref = await addDoc(collection(db, TRAINING_COLLECTIONS.sessions), {
    ...input,
    skippedShots: {},
    status: 'open',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function listMySessions(uid: string): Promise<TrainingSession[]> {
  const snap = await getDocs(
    query(collection(db, TRAINING_COLLECTIONS.sessions), where('collectorUid', '==', uid)),
  )
  return snap.docs.map((d) => toSession(d.id, d.data())).sort((a, b) => b.createdAt - a.createdAt)
}

export async function getSession(id: string): Promise<TrainingSession | null> {
  const snap = await getDoc(doc(db, TRAINING_COLLECTIONS.sessions, id))
  return snap.exists() ? toSession(snap.id, snap.data()) : null
}

export async function updateSession(
  id: string,
  patch: Partial<Pick<TrainingSession, 'skippedShots' | 'status' | 'notes' | 'vehicleType'>>,
): Promise<void> {
  await updateDoc(doc(db, TRAINING_COLLECTIONS.sessions, id), {
    ...patch,
    updatedAt: serverTimestamp(),
  })
}

export type SessionCapture = Pick<
  TrainingCapture,
  'id' | 'shotId' | 'storagePath' | 'status' | 'capturedAt'
>

export async function listSessionCaptures(
  uid: string,
  sessionId: string,
): Promise<SessionCapture[]> {
  // collectorUid filter is required, not redundant: the list rule only
  // admits queries that are provably limited to the caller's own docs.
  const snap = await getDocs(
    query(
      collection(db, TRAINING_COLLECTIONS.captures),
      where('collectorUid', '==', uid),
      where('sessionId', '==', sessionId),
    ),
  )
  return snap.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      shotId: data.shotId,
      storagePath: data.storagePath,
      status: data.status,
      capturedAt: toMillis(data.capturedAt),
    }
  })
}

/** Pre-allocates the Firestore id so Storage path and doc id match, and a
 *  retried upload overwrites rather than duplicates. */
export function newCaptureId(): string {
  return doc(collection(db, TRAINING_COLLECTIONS.captures)).id
}

export async function uploadCapture(
  item: PendingCapture,
  onProgress: (fraction: number) => void,
): Promise<void> {
  const task = uploadBytesResumable(ref(storage, item.doc.storagePath), item.blob, {
    contentType: 'image/jpeg',
  })
  await new Promise<void>((resolve, reject) => {
    task.on(
      'state_changed',
      (s) => onProgress(s.totalBytes ? s.bytesTransferred / s.totalBytes : 0),
      reject,
      () => resolve(),
    )
  })
  const { capturedAtMs, ...rest } = item.doc
  await setDoc(doc(db, TRAINING_COLLECTIONS.captures, item.id), {
    ...rest,
    capturedAt: Timestamp.fromMillis(capturedAtMs),
    reviewedAt: null,
  })
}

/** Withdraws an uploaded, still-pending photo (retake of a single shot).
 *  Already-reviewed photos are kept — the rules refuse the delete. */
export async function withdrawCapture(capture: SessionCapture): Promise<void> {
  await deleteDoc(doc(db, TRAINING_COLLECTIONS.captures, capture.id))
  try {
    await deleteObject(ref(storage, capture.storagePath))
  } catch (error) {
    if ((error as { code?: string }).code !== 'storage/object-not-found') throw error
  }
}
