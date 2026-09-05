import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'

import type {
  FuelLog,
  FuelLogDraft,
  MaintenanceLog,
  MaintenanceLogDraft,
} from '@/types/vehicle-log'

import { db } from './firebase'

// Subcollections under vehicles/{vehicleId} — covered by firestore.rules'
// dedicated fuelLogs/maintenanceLogs rule (current-owner read, current-owner
// + recordedBy==self write).

/** Firestore rejects `undefined` field values — strip them before writing. */
function stripUndefined<T extends object>(value: T): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(value)) {
    if (val !== undefined) result[key] = val
  }
  return result
}

interface FuelLogDoc {
  vehicleId: string
  refueledAt: Timestamp
  mileage: number | null
  liters: number | null
  costTwd: number
  fullTank: boolean
  note: string | null
  recordedBy: string
  createdAt: Timestamp
}

function toFuelLog(id: string, data: FuelLogDoc): FuelLog {
  return {
    id,
    vehicleId: data.vehicleId,
    refueledAt: data.refueledAt?.toMillis() ?? Date.now(),
    mileage: data.mileage ?? null,
    liters: data.liters ?? null,
    costTwd: data.costTwd,
    fullTank: data.fullTank ?? true,
    note: data.note ?? null,
    recordedBy: data.recordedBy,
    createdAt: data.createdAt?.toMillis() ?? Date.now(),
  }
}

async function listFuelLogs(vehicleId: string): Promise<FuelLog[]> {
  const snapshot = await getDocs(collection(db, 'vehicles', vehicleId, 'fuelLogs'))
  return snapshot.docs
    .map((docSnapshot) => toFuelLog(docSnapshot.id, docSnapshot.data() as FuelLogDoc))
    .sort((a, b) => b.refueledAt - a.refueledAt || b.createdAt - a.createdAt)
}

async function createFuelLog(draft: FuelLogDraft): Promise<string> {
  const docRef = await addDoc(collection(db, 'vehicles', draft.vehicleId, 'fuelLogs'), {
    ...stripUndefined(draft),
    refueledAt: Timestamp.fromMillis(draft.refueledAt),
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export interface FuelLogUpdate {
  refueledAt?: number
  mileage?: number | null
  liters?: number | null
  costTwd?: number
  fullTank?: boolean
  note?: string | null
}

async function updateFuelLog(vehicleId: string, id: string, changes: FuelLogUpdate): Promise<void> {
  const { refueledAt, ...rest } = changes
  await updateDoc(doc(db, 'vehicles', vehicleId, 'fuelLogs', id), {
    ...stripUndefined(rest),
    ...(refueledAt !== undefined ? { refueledAt: Timestamp.fromMillis(refueledAt) } : {}),
  })
}

async function deleteFuelLog(vehicleId: string, id: string): Promise<void> {
  await deleteDoc(doc(db, 'vehicles', vehicleId, 'fuelLogs', id))
}

interface MaintenanceLogDoc {
  vehicleId: string
  servicedAt: Timestamp
  mileage: number | null
  items: MaintenanceLog['items']
  shopName: string | null
  totalCostTwd: number | null
  note: string | null
  receiptUrls: string[]
  recordedBy: string
  createdAt: Timestamp
}

function toMaintenanceLog(id: string, data: MaintenanceLogDoc): MaintenanceLog {
  return {
    id,
    vehicleId: data.vehicleId,
    servicedAt: data.servicedAt?.toMillis() ?? Date.now(),
    mileage: data.mileage ?? null,
    items: data.items ?? [],
    shopName: data.shopName ?? null,
    totalCostTwd: data.totalCostTwd ?? null,
    note: data.note ?? null,
    receiptUrls: data.receiptUrls ?? [],
    recordedBy: data.recordedBy,
    createdAt: data.createdAt?.toMillis() ?? Date.now(),
  }
}

async function listMaintenanceLogs(vehicleId: string): Promise<MaintenanceLog[]> {
  const snapshot = await getDocs(collection(db, 'vehicles', vehicleId, 'maintenanceLogs'))
  return snapshot.docs
    .map((docSnapshot) => toMaintenanceLog(docSnapshot.id, docSnapshot.data() as MaintenanceLogDoc))
    .sort((a, b) => b.servicedAt - a.servicedAt || b.createdAt - a.createdAt)
}

async function createMaintenanceLog(draft: MaintenanceLogDraft): Promise<string> {
  const docRef = await addDoc(collection(db, 'vehicles', draft.vehicleId, 'maintenanceLogs'), {
    ...stripUndefined(draft),
    servicedAt: Timestamp.fromMillis(draft.servicedAt),
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

async function deleteMaintenanceLog(vehicleId: string, id: string): Promise<void> {
  await deleteDoc(doc(db, 'vehicles', vehicleId, 'maintenanceLogs', id))
}

export const vehicleLogService = {
  listFuelLogs,
  createFuelLog,
  updateFuelLog,
  deleteFuelLog,
  listMaintenanceLogs,
  createMaintenanceLog,
  deleteMaintenanceLog,
}
