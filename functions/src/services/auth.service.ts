import { getFirestore } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'
import { VerificationDoc } from './types'

/** Mirrors firestore.rules' isAdmin() — same hardcoded uid, same reasoning
 *  (see the comment on that function): an allowlist collection writable by
 *  any client would be a real privilege-escalation hole, so this only ever
 *  changes via a source deploy, on both sides, kept in lockstep. */
const ADMIN_UID = 'CMWrmo2pHsRiBu5kMj1CDJ23xd72'

/**
 * Every analyze/retry Function calls this first. Mirrors firestore.rules'
 * verification access model exactly (owner / vehicle owner / admin), plus
 * the one Group A/B/C-spec-mandated addition rules alone can't express:
 * once `isPublic == true` the whole verification is analysis-immutable,
 * including for admin (same absolute guarantee firestore.rules already
 * enforces for direct writes).
 */
export async function assertCanAnalyze(
  verificationId: string,
  callerUid: string | undefined,
): Promise<VerificationDoc> {
  if (!callerUid) {
    throw new HttpsError('unauthenticated', 'Sign-in required.')
  }
  const db = getFirestore()
  const snap = await db.collection('verifications').doc(verificationId).get()
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Verification not found.')
  }
  const data = snap.data() as Omit<VerificationDoc, 'id'>

  if (data.isPublic === true) {
    throw new HttpsError(
      'failed-precondition',
      'This verification is public and immutable — analysis and retry are no longer available.',
    )
  }

  const vehicleSnap = await db.collection('vehicles').doc(data.vehicleId).get()
  const ownerId = vehicleSnap.exists
    ? (vehicleSnap.data()?.currentOwnerId as string | undefined)
    : undefined

  const authorized = data.userId === callerUid || ownerId === callerUid || callerUid === ADMIN_UID
  if (!authorized) {
    throw new HttpsError('permission-denied', 'Not authorized for this verification.')
  }

  return { id: snap.id, ...data }
}

export function isAdminUid(uid: string | undefined): boolean {
  return uid === ADMIN_UID
}

/** Vehicle-level equivalent of assertCanAnalyze, for Functions that act on a
 * vehicles/{id} doc directly rather than a verification (e.g.
 * verifyVehicleRegistrationDocument) — mirrors firestore.rules' vehicles
 * owner/admin access model. */
export async function assertOwnsVehicle(
  vehicleId: string,
  callerUid: string | undefined,
): Promise<{ id: string; currentOwnerId: string; registrationDocumentUrl?: string | null }> {
  if (!callerUid) {
    throw new HttpsError('unauthenticated', 'Sign-in required.')
  }
  const db = getFirestore()
  const snap = await db.collection('vehicles').doc(vehicleId).get()
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Vehicle not found.')
  }
  const data = snap.data() as { currentOwnerId: string; registrationDocumentUrl?: string | null }
  const authorized = data.currentOwnerId === callerUid || callerUid === ADMIN_UID
  if (!authorized) {
    throw new HttpsError('permission-denied', 'Not authorized for this vehicle.')
  }
  return { id: snap.id, ...data }
}
