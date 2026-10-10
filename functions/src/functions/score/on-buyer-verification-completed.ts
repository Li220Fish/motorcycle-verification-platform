import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { getFirestore } from 'firebase-admin/firestore'
import { SCORE_CONFIG } from '../../services/score.config'
import { recordScoreEvent } from '../../services/score.service'

type ResultValue = 'normal' | 'attention' | 'unsure' | 'not_applicable'

interface VerificationDoc {
  type?: 'seller' | 'buyer' | 'professional'
  status?: string
  userId?: string
  relatedVerificationId?: string
}

async function loadAnswerResults(verificationId: string): Promise<Map<string, ResultValue>> {
  const snap = await getFirestore()
    .collection('verifications')
    .doc(verificationId)
    .collection('answers')
    .get()
  const byItemId = new Map<string, ResultValue>()
  for (const doc of snap.docs) {
    const result = doc.data().result as ResultValue | undefined
    if (result) byItemId.set(doc.id, result)
  }
  return byItemId
}

/**
 * 交易評分 (users/{uid}.score) — disclosure-comparison leg (see
 * score.config.ts's top comment for the full design). Fires once per buyer
 * re-verification, on the status transition into 'completed', and scores
 * the ORIGINAL SELLER on whether their own verification's disclosure held
 * up against the buyer's independent re-check of the same items.
 *
 * Deliberately a Firestore trigger, not something the client calls directly
 * — completeVerification() already runs client-side (verification.store.ts)
 * and firestore.rules locks `users/{uid}.score` to Trusted-Backend-only, so
 * this is the one place that can actually move it for this event, the same
 * "a real completion trigger... writes via Admin SDK" the transactions/{id}
 * rule comment already anticipated.
 */
export const onBuyerVerificationCompleted = onDocumentUpdated(
  'verifications/{verificationId}',
  async (event) => {
    const before = event.data?.before.data() as VerificationDoc | undefined
    const after = event.data?.after.data() as VerificationDoc | undefined
    if (!before || !after) return
    // Edge-triggered: only the moment status first becomes 'completed', so a
    // later unrelated update to an already-completed buyer verification
    // (e.g. an admin edit) never re-fires this and double-scores the seller.
    if (before.status === 'completed' || after.status !== 'completed') return
    if (after.type !== 'buyer' || !after.relatedVerificationId) return

    const { verificationId: buyerVerificationId } = event.params
    const db = getFirestore()
    const sellerVerificationSnap = await db
      .collection('verifications')
      .doc(after.relatedVerificationId)
      .get()
    const sellerVerification = sellerVerificationSnap.data() as VerificationDoc | undefined
    const sellerUid = sellerVerification?.userId
    if (!sellerUid) return

    const [sellerAnswers, buyerAnswers] = await Promise.all([
      loadAnswerResults(after.relatedVerificationId),
      loadAnswerResults(buyerVerificationId),
    ])

    let totalDelta = 0
    for (const [itemId, sellerResult] of sellerAnswers) {
      const buyerResult = buyerAnswers.get(itemId)
      if (!buyerResult) continue
      if (sellerResult === 'not_applicable' || buyerResult === 'not_applicable') continue
      if (buyerResult === 'unsure') continue // inconclusive re-check, no signal either way

      const sellerSaidFine = sellerResult === 'normal'
      const buyerFoundIssue = buyerResult === 'attention'
      if (sellerSaidFine && buyerFoundIssue) {
        totalDelta += SCORE_CONFIG.disclosureMissDelta
      } else if (sellerResult === buyerResult) {
        totalDelta += SCORE_CONFIG.disclosureMatchDelta
      }
      // Seller flagged 需要注意, buyer's re-check came back 正常: the seller
      // was cautious, not dishonest — neutral, not counted either way.
    }

    await recordScoreEvent(sellerUid, totalDelta, 'disclosure_comparison', {
      verificationId: after.relatedVerificationId,
      relatedVerificationId: buyerVerificationId,
    })
  },
)
