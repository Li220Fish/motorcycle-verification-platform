import { getFlatItems } from '@/data/verification'
import { verificationService } from '@/services/firebase/verification.service'
import type { AnswerResultValue } from '@/types/verification-evidence'

export interface ComparisonItem {
  buyerItemId: string
  sellerItemId: string
  label: string
  sellerResult?: AnswerResultValue
  buyerResult?: AnswerResultValue
  match: 'match' | 'different' | 'not_checked'
}

/**
 * Buyer re-verification's steps 1–45 are the exact same items (same IDs) as
 * the Seller flow — see buyer-verification.ts, which imports Seller's
 * sections directly rather than duplicating them. So every one of those 45
 * items now has a real 1:1 counterpart, not just the 3 hand-picked pairs the
 * old, structurally-different Buyer flow allowed. Steps 46+ (上路／熱車檢查)
 * have no Seller equivalent (Seller never rides the vehicle) and are
 * excluded here by construction — getFlatItems('seller') only has 45.
 */
async function buildComparison(
  sellerVerificationId: string,
  buyerVerificationId: string,
): Promise<ComparisonItem[]> {
  const [sellerAnswers, buyerAnswers] = await Promise.all([
    verificationService.listAnswers(sellerVerificationId),
    verificationService.listAnswers(buyerVerificationId),
  ])
  const sellerMap = new Map(sellerAnswers.map((answer) => [answer.itemId, answer]))
  const buyerMap = new Map(buyerAnswers.map((answer) => [answer.itemId, answer]))

  return getFlatItems('seller').map(({ item }) => {
    const sellerAnswer = sellerMap.get(item.id)
    const buyerAnswer = buyerMap.get(item.id)

    let match: ComparisonItem['match'] = 'not_checked'
    if (sellerAnswer && buyerAnswer) {
      match = sellerAnswer.result === buyerAnswer.result ? 'match' : 'different'
    }

    return {
      buyerItemId: item.id,
      sellerItemId: item.id,
      label: item.title,
      sellerResult: sellerAnswer?.result,
      buyerResult: buyerAnswer?.result,
      match,
    }
  })
}

export const comparisonService = { buildComparison }
