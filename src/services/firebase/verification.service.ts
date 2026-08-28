import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'

import type { Verification, VerificationDraft, VerificationStatus } from '@/types/verification'
import type { VerificationAnswer, VerificationEvidence } from '@/types/verification-evidence'

import { db } from './firebase'

const COLLECTION = 'verifications'

/** Firestore rejects `undefined` field values — strip them before writing. */
function stripUndefined<T extends object>(value: T): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(value)) {
    if (val !== undefined) result[key] = val
  }
  return result
}

interface VerificationDoc extends Omit<
  VerificationDraft,
  'createdAt' | 'completedAt' | 'expiresAt'
> {
  createdAt: Timestamp
  completedAt?: Timestamp
  expiresAt?: Timestamp
}

function toVerification(id: string, data: VerificationDoc): Verification {
  return {
    id,
    vehicleId: data.vehicleId,
    userId: data.userId,
    type: data.type,
    status: data.status,
    mileage: data.mileage,
    relatedVerificationId: data.relatedVerificationId,
    transactionDecision: data.transactionDecision,
    createdAt: data.createdAt?.toMillis() ?? Date.now(),
    completedAt: data.completedAt?.toMillis(),
    expiresAt: data.expiresAt?.toMillis(),
  }
}

async function create(draft: VerificationDraft): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...stripUndefined(draft),
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

async function setStatus(id: string, status: VerificationStatus): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { status })
}

async function complete(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    status: 'completed',
    completedAt: serverTimestamp(),
  })
}

async function saveTransactionDecision(
  id: string,
  transactionDecision: Verification['transactionDecision'],
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { transactionDecision })
}

// --- Answers subcollection: verifications/{id}/answers/{itemId} ---

interface AnswerDoc extends Omit<VerificationAnswer, 'updatedAt'> {
  updatedAt: Timestamp
}

async function saveAnswer(verificationId: string, answer: VerificationAnswer): Promise<void> {
  await setDoc(doc(db, COLLECTION, verificationId, 'answers', answer.itemId), {
    ...stripUndefined(answer),
    updatedAt: serverTimestamp(),
  })
}

async function listAnswers(verificationId: string): Promise<VerificationAnswer[]> {
  const snapshot = await getDocs(collection(db, COLLECTION, verificationId, 'answers'))
  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data() as AnswerDoc
    return { ...data, updatedAt: data.updatedAt?.toMillis() ?? Date.now() }
  })
}

// --- Evidence subcollection: verifications/{id}/evidence/{evidenceId} ---

interface EvidenceDoc extends Omit<VerificationEvidence, 'createdAt'> {
  createdAt: Timestamp
}

async function saveEvidence(evidence: VerificationEvidence): Promise<void> {
  await setDoc(doc(db, COLLECTION, evidence.verificationId, 'evidence', evidence.id), {
    ...stripUndefined(evidence),
    createdAt: serverTimestamp(),
  })
}

async function listEvidence(verificationId: string): Promise<VerificationEvidence[]> {
  const snapshot = await getDocs(collection(db, COLLECTION, verificationId, 'evidence'))
  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data() as EvidenceDoc
    return { ...data, createdAt: data.createdAt?.toMillis() ?? Date.now() }
  })
}

export const verificationService = {
  create,
  get,
  listByVehicle,
  setStatus,
  complete,
  saveTransactionDecision,
  saveAnswer,
  listAnswers,
  saveEvidence,
  listEvidence,
}
