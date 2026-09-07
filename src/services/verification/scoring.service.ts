import { getFlatItems } from '@/data/verification'
import type { VerificationFlowKind } from '@/data/verification'
import { aiVisionItemsForAprItem } from '@/data/verification/ai-vision-items'
import type { AnswerResultValue, VerificationAnswer } from '@/types/verification-evidence'

/**
 * Single source of truth for the 車況評分 formula — previously duplicated
 * (with a diverging empty-set edge case) across VerificationReportView.vue
 * and MyListingsView.vue/scripts/seed-my-listings.mjs.
 *
 * Rules (Task C5 P0, unchanged by Verification v2):
 * - `not_applicable` never enters the numerator or denominator.
 * - An item with no saved answer at all (never captured/checked) simply
 *   isn't in `answers` — it already can't inflate the denominator, since
 *   there's no "not_checked" sentinel ever written.
 * - `unsure` counts toward the denominator but never the numerator — scored
 *   the same as `attention` (not `normal`), per spec: "不能當 normal".
 * - Returns `null` when there is nothing eligible to score (never fabricate
 *   a 100 for zero data) — callers show "尚無足夠資料計算" for null.
 *
 * This function itself stays a pure array-in/number-out formula with no
 * knowledge of item ids — `scorableAnswers` below is what call sites must
 * feed it (see its own doc comment for why: v2 §37 needs Optional items and
 * AI/placeholder double-counting kept out entirely, which requires walking
 * the actual flow definition, not just the raw answers).
 */
export function computeVerificationScore(answers: VerificationAnswer[]): number | null {
  const eligible = answers.filter((answer) => answer.result !== 'not_applicable')
  if (eligible.length === 0) return null
  const normalCount = eligible.filter((answer) => answer.result === 'normal').length
  return Math.round((normalCount / eligible.length) * 100)
}

const RESULT_SEVERITY: Record<AnswerResultValue, number> = {
  attention: 3,
  unsure: 2,
  normal: 1,
  not_applicable: 0,
}

/**
 * Verification v2 §37 — "Optional 全部不參與分數" plus a pre-existing bug
 * this migration surfaces: Core Vision v2 (and the old Group A/B/C before
 * it) writes its AI verdict as a SEPARATE answer doc from the checklist
 * item's own placeholder answer (e.g. `chain_sprocket_condition` alongside
 * `APR-transmission-chain`) — feeding `computeVerificationScore` the raw
 * answers dict counts both, double-weighting every AI-graded checklist item.
 * This walks the real flow definition (so Optional item ids, which have no
 * dedicated marker of their own, are correctly excluded) and merges each
 * required checklist item with its AI answer(s) — same worst-of merge
 * VerificationReportView.vue's `effectiveItemResult` already does for
 * display — into exactly one scorable answer per required item.
 */
export function scorableAnswers(
  answers: Record<string, VerificationAnswer>,
  flowKind: VerificationFlowKind,
): VerificationAnswer[] {
  const result: VerificationAnswer[] = []
  for (const flat of getFlatItems(flowKind)) {
    if (!flat.item.required) continue
    const baseAnswer = answers[flat.item.id]
    const aiAnswers = aiVisionItemsForAprItem(flat.item.id)
      .map((aiItem) => answers[aiItem.id])
      .filter((answer): answer is VerificationAnswer => !!answer?.aiResult)

    if (aiAnswers.length > 0) {
      const worst = aiAnswers.reduce((worstSoFar, candidate) =>
        RESULT_SEVERITY[candidate.result] > RESULT_SEVERITY[worstSoFar.result]
          ? candidate
          : worstSoFar,
      )
      result.push({ ...worst, itemId: flat.item.id })
    } else if (baseAnswer) {
      result.push(baseAnswer)
    }
  }
  return result
}
