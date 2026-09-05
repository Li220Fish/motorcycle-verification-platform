import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'

import type { Vehicle, VehicleDraft } from '@/types/vehicle'

import { db } from './firebase'

const COLLECTION = 'vehicles'

interface VehicleDoc extends Omit<VehicleDraft, 'createdAt' | 'updatedAt'> {
  currentOwnerId: string
  sortOrder?: number | null
  registrationVerification?: Vehicle['registrationVerification']
  createdAt: Timestamp
  updatedAt: Timestamp
}

/** A just-written serverTimestamp() field can still be an unresolved local
 * sentinel (not a Timestamp) for a brief window right after create() — seen
 * live via createVehicle() -> fetchVehicles() racing the write. `data.x?.
 * toMillis()` alone doesn't guard against that: optional chaining only
 * short-circuits null/undefined, not a truthy non-Timestamp value, so it
 * throws instead of falling through to `?? Date.now()`. */
function toMillisOrNow(value: Timestamp | null | undefined): number {
  return typeof value?.toMillis === 'function' ? value.toMillis() : Date.now()
}

function toVehicle(id: string, data: VehicleDoc): Vehicle {
  return {
    id,
    currentOwnerId: data.currentOwnerId,
    modelId: data.modelId ?? null,
    brand: data.brand,
    model: data.model,
    manufactureYear: data.manufactureYear ?? null,
    mileage: data.mileage,
    registrationDate: data.registrationDate ?? null,
    displacementCc: data.displacementCc ?? null,
    transmission: data.transmission ?? null,
    color: data.color ?? null,
    modified: data.modified ?? false,
    modificationNote: data.modificationNote ?? null,
    licensePlate: data.licensePlate,
    engineNumber: data.engineNumber ?? null,
    chassisNumber: data.chassisNumber ?? null,
    photos: data.photos ?? [],
    registrationDocumentUrl: data.registrationDocumentUrl ?? null,
    registrationVerification: data.registrationVerification,
    sortOrder: data.sortOrder ?? null,
    createdAt: toMillisOrNow(data.createdAt),
    updatedAt: toMillisOrNow(data.updatedAt),
  }
}

/** Manually-ordered first (ascending `sortOrder`), then anything never
 * reordered, newest-first — matches list()/listAll()'s previous plain
 * "newest first" behavior for a garage nobody has reordered yet. */
function byGarageOrder(a: Vehicle, b: Vehicle): number {
  const aOrder = a.sortOrder ?? null
  const bOrder = b.sortOrder ?? null
  if (aOrder !== null && bOrder !== null) return aOrder - bOrder
  if (aOrder !== null) return -1
  if (bOrder !== null) return 1
  return b.createdAt - a.createdAt
}

/**
 * P2 fix: `currentOwnerId` must be stamped from the authenticated caller at
 * write time (never trusted from the form draft) — this is what `list()`
 * filters on to keep "我的車輛" scoped to the signed-in user. See
 * `list()` below and the Vehicle Data Isolation section of the UX report.
 */
async function create(draft: VehicleDraft, ownerId: string): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...draft,
    currentOwnerId: ownerId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

async function get(id: string): Promise<Vehicle | null> {
  const snapshot = await getDoc(doc(db, COLLECTION, id))
  if (!snapshot.exists()) return null
  return toVehicle(snapshot.id, snapshot.data() as VehicleDoc)
}

/**
 * Scoped to the signed-in owner — previously queried the entire `vehicles`
 * collection with no filter at all, so every account's "我的車輛" (and Home)
 * showed every vehicle ever created by anyone, including leftover Playwright
 * regression-test vehicles ("YAMAHA Regression ..."). See the Vehicle Data
 * Isolation finding in the UX report.
 *
 * Sorted client-side rather than via `orderBy('createdAt')` in the query —
 * an equality filter on `currentOwnerId` plus a different-field `orderBy`
 * needs a composite index that isn't deployed to the live Firestore project,
 * and a per-user vehicle list is small enough that this is unnecessary
 * infrastructure to add just for sorting. Order is the garage's manual
 * order (byGarageOrder) — index 0 is what HomeContent.vue features.
 */
async function list(ownerId: string): Promise<Vehicle[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), where('currentOwnerId', '==', ownerId)),
  )
  return snapshot.docs
    .map((docSnapshot) => toVehicle(docSnapshot.id, docSnapshot.data() as VehicleDoc))
    .sort(byGarageOrder)
}

/**
 * Unfiltered — every vehicle any account has ever created, real seeded demo
 * data included. Only for community/reference features that read across
 * accounts (see 車輛新知 in VehicleKnowledgeSection.vue), never for
 * account-scoped views — those must keep using `list(ownerId)` above.
 */
async function listAll(): Promise<Vehicle[]> {
  const snapshot = await getDocs(collection(db, COLLECTION))
  return snapshot.docs
    .map((docSnapshot) => toVehicle(docSnapshot.id, docSnapshot.data() as VehicleDoc))
    .sort((a, b) => b.createdAt - a.createdAt)
}

async function update(id: string, changes: Partial<VehicleDraft>): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...changes,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Persists a garage's manual order after a long-press-drag reorder
 * (VehiclesView.vue) — `orderedIds` is the caller's full vehicle list,
 * front to back, and gets written as sequential `sortOrder` values (0, 1,
 * 2, ...) in one batch. Every id must already belong to the caller — this
 * relies on firestore.rules' existing owner-only vehicles update rule
 * (currentOwnerId is unchanged by this write), not a new rule of its own.
 */
async function reorder(orderedIds: string[]): Promise<void> {
  const batch = writeBatch(db)
  orderedIds.forEach((id, index) => {
    batch.update(doc(db, COLLECTION, id), { sortOrder: index, updatedAt: serverTimestamp() })
  })
  await batch.commit()
}

async function remove(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id))
}

export const vehicleService = { create, get, list, listAll, update, remove, reorder }
