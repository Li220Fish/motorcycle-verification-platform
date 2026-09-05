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
  writeBatch,
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

const PROTOCOL_VERSION = 1
const SCHEMA_VERSION = 1

interface VerificationDoc extends Omit<
  VerificationDraft,
  'createdAt' | 'completedAt' | 'expiresAt'
> {
  isPublic?: boolean
  protocolVersion?: number
  schemaVersion?: number
  createdAt: Timestamp
  completedAt?: Timestamp
  expiresAt?: Timestamp
  environmentContext?: Verification['environmentContext']
  coldStateContext?: Verification['coldStateContext']
}

/**
 * `serverTimestamp()`-written fields resolve to a real Timestamp on read —
 * but several Trusted Backend writes (functions/src/services/answer-writer.
 * service.ts's `updatedAt: Date.now()`) write a plain millis NUMBER instead.
 * `value?.toMillis()` alone doesn't guard against that: optional chaining
 * only short-circuits null/undefined, not a truthy non-Timestamp value, so
 * it throws instead of falling through. That throw inside listAnswers()'s
 * .map() below used to silently empty out the entire remote answers list
 * (swallowed by verification.store.ts's loadFlow() .catch(() => [])) for ANY
 * verification with even one AI-graded item — which is nearly all of them —
 * making the mobile report/result screens fall back to the local device's
 * own pre-analysis draft cache instead of the real graded results. Same bug
 * class as vehicle.service.ts's toMillisOrNow fix earlier this session,
 * confirmed live on a real device (every "unsure"/"attention" AI verdict was
 * silently replaced by the stale "normal" placeholder from before analysis
 * ran, and every aiResult.details.note vanished along with it).
 */
function toMillisOrNow(value: Timestamp | number | null | undefined): number {
  if (typeof value === 'number') return value
  return typeof value?.toMillis === 'function' ? value.toMillis() : Date.now()
}

function toMillisOrUndefined(value: Timestamp | number | null | undefined): number | undefined {
  if (value == null) return undefined
  if (typeof value === 'number') return value
  return typeof value.toMillis === 'function' ? value.toMillis() : undefined
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
    isPublic: data.isPublic ?? false,
    protocolVersion: data.protocolVersion ?? PROTOCOL_VERSION,
    schemaVersion: data.schemaVersion ?? SCHEMA_VERSION,
    createdAt: toMillisOrNow(data.createdAt),
    completedAt: toMillisOrUndefined(data.completedAt),
    expiresAt: toMillisOrUndefined(data.expiresAt),
    environmentContext: data.environmentContext,
    coldStateContext: data.coldStateContext,
  }
}

async function create(draft: VerificationDraft): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...stripUndefined(draft),
    isPublic: false,
    protocolVersion: PROTOCOL_VERSION,
    schemaVersion: SCHEMA_VERSION,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

/** One-way: a listing's publish() flips this true on every verification it
 * carries. Firestore rules enforce the direction — see firestore.rules'
 * verifications update rule (only allowed while isPublic is still false). */
async function setPublic(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { isPublic: true })
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

/**
 * Powers the Verification tab's "最近的驗證紀錄" list. Sorted client-side
 * rather than via `orderBy('createdAt')` in the query — same reasoning as
 * `vehicleService.list()`: an equality filter on `userId` plus a
 * different-field `orderBy` needs a composite index that isn't deployed to
 * the live Firestore project, and this list is bounded/small anyway.
 */
async function listByUser(userId: string): Promise<Verification[]> {
  const snapshot = await getDocs(query(collection(db, COLLECTION), where('userId', '==', userId)))
  return snapshot.docs
    .map((docSnapshot) => toVerification(docSnapshot.id, docSnapshot.data() as VerificationDoc))
    .sort((a, b) => b.createdAt - a.createdAt)
}

async function setStatus(id: string, status: VerificationStatus): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { status })
}

/** Deletes a verification and its answers/evidence subcollections — Firestore
 * never cascade-deletes subcollections on its own. */
async function remove(id: string): Promise<void> {
  const [answersSnapshot, evidenceSnapshot] = await Promise.all([
    getDocs(collection(db, COLLECTION, id, 'answers')),
    getDocs(collection(db, COLLECTION, id, 'evidence')),
  ])
  const batch = writeBatch(db)
  for (const docSnapshot of answersSnapshot.docs) batch.delete(docSnapshot.ref)
  for (const docSnapshot of evidenceSnapshot.docs) batch.delete(docSnapshot.ref)
  batch.delete(doc(db, COLLECTION, id))
  await batch.commit()
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
  updatedAt: Timestamp | number
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
    return { ...data, updatedAt: toMillisOrNow(data.updatedAt) }
  })
}

// --- Evidence subcollection: verifications/{id}/evidence/{evidenceId} ---

interface EvidenceDoc extends Omit<VerificationEvidence, 'createdAt'> {
  createdAt: Timestamp | number
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
    return { ...data, createdAt: toMillisOrNow(data.createdAt) }
  })
}

export const verificationService = {
  create,
  get,
  listByVehicle,
  listByUser,
  setStatus,
  setPublic,
  remove,
  complete,
  saveTransactionDecision,
  saveAnswer,
  listAnswers,
  saveEvidence,
  listEvidence,
}
