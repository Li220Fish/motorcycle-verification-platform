import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore'
import { SCORE_RULES_VERSION } from './score.config'

export type ScoreEventReason = 'disclosure_comparison' | 'appointment_kept'

export interface ScoreEventRef {
  verificationId?: string
  relatedVerificationId?: string
  listingId?: string
  appointmentId?: string
}

/**
 * The only writer of users/{uid}.score (firestore.rules locks it to
 * Trusted-Backend-only — see that rule's own comment). Every call also
 * drops an audit-trail doc into users/{uid}/scoreEvents/{id} so a score can
 * always be explained ("why is this 7, not 0") rather than being an opaque
 * running total — same reasoning analysisStatus exists for AI routes:
 * a number with no trace behind it is not trustworthy on its own.
 *
 * Deliberately NOT written into transactions/{id} (the existing schema-only
 * collection firestore.rules already reserves for an actual completed SALE,
 * with a price) — a disclosure-comparison event fires whenever a buyer
 * finishes re-verifying, which can happen even when they decide not to buy
 * (transactionDecision: 'not_buying'). Conflating that with "a sale
 * happened" would misuse a schema that already means something more
 * specific.
 */
export async function recordScoreEvent(
  uid: string,
  delta: number,
  reason: ScoreEventReason,
  ref: ScoreEventRef = {},
): Promise<void> {
  if (delta === 0) return
  const db = getFirestore()
  const userRef = db.collection('users').doc(uid)
  const eventRef = userRef.collection('scoreEvents').doc()

  const batch = db.batch()
  batch.set(userRef, { score: FieldValue.increment(delta) }, { merge: true })
  batch.set(eventRef, {
    delta,
    reason,
    rulesVersion: SCORE_RULES_VERSION,
    ...ref,
    createdAt: Timestamp.now(),
  })
  await batch.commit()
}
