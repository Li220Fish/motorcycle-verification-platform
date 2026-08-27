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
  where,
} from 'firebase/firestore'

import type { Verification, VerificationDraft } from '@/types/verification'

import { db } from './firebase'

const COLLECTION = 'verifications'

interface VerificationDoc extends Omit<VerificationDraft, 'createdAt' | 'completedAt'> {
  createdAt: Timestamp
  completedAt?: Timestamp
}

function toVerification(id: string, data: VerificationDoc): Verification {
  return {
    id,
    vehicleId: data.vehicleId,
    userId: data.userId,
    type: data.type,
    status: data.status,
    mileage: data.mileage,
    createdAt: data.createdAt?.toMillis() ?? Date.now(),
    completedAt: data.completedAt?.toMillis(),
  }
}

async function create(draft: VerificationDraft): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...draft,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

async function get(id: string): Promise<Verification | null> {
  const snapshot = await getDoc(doc(db, COLLECTION, id))
  if (!snapshot.exists()) return null
  return toVerification(snapshot.id, snapshot.data() as VerificationDoc)
}

async function listByVehicle(vehicleId: string): Promise<Verification[]> {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTION),
      where('vehicleId', '==', vehicleId),
      orderBy('createdAt', 'desc'),
    ),
  )
  return snapshot.docs.map((docSnapshot) =>
    toVerification(docSnapshot.id, docSnapshot.data() as VerificationDoc),
  )
}

async function complete(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    status: 'completed',
    completedAt: serverTimestamp(),
  })
}

export const verificationService = { create, get, listByVehicle, complete }
