import { BUYER_TO_SELLER_COMPARISON_MAP } from '@/data/verification/comparison-map'
import { findItemById } from '@/data/verification'
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
 * Comparison is fully rule-based on Seller/Buyer answers for the item pairs
 * that have a clear 1:1 counterpart (see comparison-map.ts) — photo AI never
 * participates in this judgement, per V0.2 spec §30.
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

  return Object.entries(BUYER_TO_SELLER_COMPARISON_MAP).map(([buyerItemId, sellerItemId]) => {
    const sellerAnswer = sellerMap.get(sellerItemId)
    const buyerAnswer = buyerMap.get(buyerItemId)
    const label = findItemById('buyer', buyerItemId)?.title ?? buyerItemId

    let match: ComparisonItem['match'] = 'not_checked'
    if (sellerAnswer && buyerAnswer) {
      match = sellerAnswer.result === buyerAnswer.result ? 'match' : 'different'
    }

    return {
      buyerItemId,
      sellerItemId,
      label,
      sellerResult: sellerAnswer?.result,
      buyerResult: buyerAnswer?.result,
      match,
    }
  })
}

export const comparisonService = { buildComparison }
