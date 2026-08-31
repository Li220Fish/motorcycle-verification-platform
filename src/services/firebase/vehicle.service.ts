import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'

import type { Vehicle, VehicleDraft } from '@/types/vehicle'

import { db } from './firebase'

const COLLECTION = 'vehicles'

interface VehicleDoc extends Omit<VehicleDraft, 'createdAt' | 'updatedAt'> {
  createdAt: Timestamp
  updatedAt: Timestamp
}

function toVehicle(id: string, data: VehicleDoc): Vehicle {
  return {
    id,
    brand: data.brand,
    model: data.model,
    year: data.year,
    mileage: data.mileage,
    avgFuelConsumption: data.avgFuelConsumption ?? null,
    maintenanceReminderCount: data.maintenanceReminderCount ?? null,
    licensePlate: data.licensePlate,
    engineNumber: data.engineNumber ?? null,
    chassisNumber: data.chassisNumber ?? null,
    imageUrl: data.imageUrl ?? null,
    currentOwnerId: data.currentOwnerId,
    createdAt: data.createdAt?.toMillis() ?? Date.now(),
    updatedAt: data.updatedAt?.toMillis() ?? Date.now(),
  }
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
 * infrastructure to add just for sorting.
 */
async function list(ownerId: string): Promise<Vehicle[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), where('currentOwnerId', '==', ownerId)),
  )
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

export const vehicleService = { create, get, list, update }
