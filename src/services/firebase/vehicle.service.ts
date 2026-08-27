import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
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
    licensePlate: data.licensePlate,
    currentOwnerId: data.currentOwnerId,
    createdAt: data.createdAt?.toMillis() ?? Date.now(),
    updatedAt: data.updatedAt?.toMillis() ?? Date.now(),
  }
}

async function create(draft: VehicleDraft): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...draft,
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

async function list(): Promise<Vehicle[]> {
  const snapshot = await getDocs(query(collection(db, COLLECTION), orderBy('createdAt', 'desc')))
  return snapshot.docs.map((docSnapshot) =>
    toVehicle(docSnapshot.id, docSnapshot.data() as VehicleDoc),
  )
}

async function update(id: string, changes: Partial<VehicleDraft>): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...changes,
    updatedAt: serverTimestamp(),
  })
}

export const vehicleService = { create, get, list, update }
