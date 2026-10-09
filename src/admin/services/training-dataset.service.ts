/**
 * Admin-side access to the 訓練資料集 collections written by capture-app/
 * (see src/data/training/training-dataset.types.ts for the data model).
 * Same "everything, one shot" shape as admin-data.service.ts.
 */
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { getDownloadURL, ref as storageRef } from 'firebase/storage'

import { db, storage } from '@/services/firebase/firebase'
import {
  TRAINING_COLLECTIONS,
  yoloObbLine,
  type TrainingAnnotation,
  type TrainingCapture,
  type TrainingCaptureStatus,
  type TrainingSession,
  type VehicleType,
} from '@/data/training/training-dataset.types'
import { partClassIndex, TRAINING_PART_LABELS } from '@/data/training/training-shots'

function toMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis()
  if (typeof value === 'number') return value
  return 0
}

/** Pre-OBB captures (shot plan v1) stored {x,y,w,h}; lift them to OBB. */
function normalizeAnnotations(list: unknown): TrainingAnnotation[] {
  if (!Array.isArray(list)) return []
  return list.map((a) => {
    const box = a.box ?? {}
    if (typeof box.cx === 'number') return { label: a.label, box }
    return {
      label: a.label,
      box: { cx: box.x + box.w / 2, cy: box.y + box.h / 2, w: box.w, h: box.h, angle: 0 },
    }
  })
}

export async function listTrainingCaptures(): Promise<TrainingCapture[]> {
  const snap = await getDocs(collection(db, TRAINING_COLLECTIONS.captures))
  return snap.docs
    .map((d) => {
      const x = d.data()
      return {
        id: d.id,
        sessionId: x.sessionId,
        collectorUid: x.collectorUid,
        vehicleModelId: x.vehicleModelId ?? null,
        vehicleModelLabel: x.vehicleModelLabel ?? '',
        vehicleType: x.vehicleType ?? 'scooter',
        shotId: x.shotId,
        partKey: x.partKey,
        view: x.view,
        shotPlanVersion: x.shotPlanVersion ?? 1,
        storagePath: x.storagePath,
        width: x.width,
        height: x.height,
        guideAnnotations: normalizeAnnotations(x.guideAnnotations),
        annotations: x.annotations ? normalizeAnnotations(x.annotations) : null,
        quality: x.quality ?? {
          brightness: 0,
          sharpness: 0,
          rollDeg: null,
          pitchDeg: null,
          warnings: [],
        },
        device: x.device ?? { userAgent: '', videoWidth: 0, videoHeight: 0 },
        status: x.status ?? 'pending',
        rejectReason: x.rejectReason ?? null,
        reviewedAt: x.reviewedAt ? toMillis(x.reviewedAt) : null,
        capturedAt: toMillis(x.capturedAt),
      } satisfies TrainingCapture
    })
    .sort((a, b) => b.capturedAt - a.capturedAt)
}

export async function listTrainingSessions(): Promise<TrainingSession[]> {
  const snap = await getDocs(collection(db, TRAINING_COLLECTIONS.sessions))
  return snap.docs.map((d) => {
    const x = d.data()
    return {
      id: d.id,
      collectorUid: x.collectorUid,
      vehicleModelId: x.vehicleModelId ?? null,
      vehicleModelLabel: x.vehicleModelLabel ?? '',
      vehicleType: x.vehicleType ?? 'scooter',
      hasChain: !!x.hasChain,
      notes: x.notes ?? '',
      skippedShots: x.skippedShots ?? {},
      status: x.status === 'completed' ? 'completed' : 'open',
      createdAt: toMillis(x.createdAt),
      updatedAt: toMillis(x.updatedAt),
    }
  })
}

export async function saveCaptureReview(
  id: string,
  patch: {
    annotations: TrainingAnnotation[]
    status: TrainingCaptureStatus
    rejectReason?: string | null
  },
): Promise<void> {
  await updateDoc(doc(db, TRAINING_COLLECTIONS.captures, id), {
    annotations: patch.annotations,
    status: patch.status,
    rejectReason: patch.status === 'rejected' ? (patch.rejectReason ?? null) : null,
    reviewedAt: serverTimestamp(),
  })
}

export interface VehicleClassification {
  vehicleModelId: string | null
  vehicleModelLabel: string
  vehicleType: VehicleType
}

/**
 * 車款分類 correction from the annotation page — collectors sometimes pick
 * the wrong catalog entry or type a free-text model. Rewrites the given
 * captures (and their session, so later uploads of that bike inherit it)
 * in one batch.
 */
export async function reclassifyCaptures(
  captureIds: string[],
  sessionId: string | null,
  vehicle: VehicleClassification,
): Promise<void> {
  const batch = writeBatch(db)
  for (const id of captureIds)
    batch.update(doc(db, TRAINING_COLLECTIONS.captures, id), { ...vehicle })
  if (sessionId) {
    batch.update(doc(db, TRAINING_COLLECTIONS.sessions, sessionId), {
      ...vehicle,
      updatedAt: serverTimestamp(),
    })
  }
  await batch.commit()
}

const urlCache = new Map<string, string>()
export async function captureImageUrl(path: string): Promise<string> {
  const hit = urlCache.get(path)
  if (hit) return hit
  const url = await getDownloadURL(storageRef(storage, path))
  urlCache.set(path, url)
  return url
}

// --- 採集人員 allowlist ---

export interface DataCollector {
  uid: string
  email: string
  addedAt: number
}

export async function listDataCollectors(): Promise<DataCollector[]> {
  const snap = await getDocs(collection(db, TRAINING_COLLECTIONS.collectors))
  return snap.docs.map((d) => ({
    uid: d.id,
    email: d.data().email ?? '',
    addedAt: toMillis(d.data().addedAt),
  }))
}

export async function addDataCollector(uid: string, email: string): Promise<void> {
  await setDoc(doc(db, TRAINING_COLLECTIONS.collectors, uid), { email, addedAt: serverTimestamp() })
}

export async function removeDataCollector(uid: string): Promise<void> {
  await deleteDoc(doc(db, TRAINING_COLLECTIONS.collectors, uid))
}

// --- YOLO26-OBB export ---

/**
 * Manifest consumed by scripts/export-training-dataset.mjs, which downloads
 * the images and writes an Ultralytics dataset folder. Labels are already
 * in YOLO-OBB line format (`class x1 y1 … x4 y4`, normalized corners).
 * Only `approved` captures are included.
 */
export interface ObbDatasetManifest {
  format: 'yolo-obb'
  createdAt: string
  names: string[]
  keys: string[]
  images: {
    captureId: string
    sessionId: string
    storagePath: string
    vehicleModelId: string | null
    vehicleModelLabel: string
    vehicleType: string
    shotId: string
    width: number
    height: number
    labels: string[]
  }[]
}

export function buildObbManifest(captures: TrainingCapture[]): ObbDatasetManifest {
  return {
    format: 'yolo-obb',
    createdAt: new Date().toISOString(),
    names: TRAINING_PART_LABELS.map((p) => p.label),
    keys: TRAINING_PART_LABELS.map((p) => p.key),
    images: captures
      .filter((c) => c.status === 'approved')
      .map((c) => ({
        captureId: c.id,
        sessionId: c.sessionId,
        storagePath: c.storagePath,
        vehicleModelId: c.vehicleModelId,
        vehicleModelLabel: c.vehicleModelLabel,
        vehicleType: c.vehicleType,
        shotId: c.shotId,
        width: c.width,
        height: c.height,
        labels: (c.annotations ?? [])
          .filter((a) => partClassIndex(a.label) >= 0)
          .map((a) => yoloObbLine(partClassIndex(a.label), a.box, c.width, c.height)),
      })),
  }
}
