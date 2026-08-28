/**
 * Buyer item ID → Seller item ID, for the pairs that have a clear 1:1
 * counterpart across the two flows (voltage, lighting, cold-check). Most
 * Buyer items (chat prompts, budget, paperwork prep, ride-safety consensus…)
 * have no Seller equivalent by design — see V0.2 spec §3, and B7-05 in the
 * source content, which only calls for automatic comparison on the voltage
 * data. Everything else is compared by the buyer's own judgement at B11.
 */
export const BUYER_TO_SELLER_COMPARISON_MAP: Record<string, string> = {
  'B3-03': 'S5-03',
  'B7-01': 'S7-01',
  'B7-02': 'S7-02',
  'B7-03': 'S7-03',
  'B7-04': 'S7-04',
  'B8-01': 'S8-01',
  'B8-02': 'S8-02',
  'B8-03': 'S8-03',
  'B8-04': 'S8-04',
  'B8-05': 'S8-05',
  'B8-06': 'S8-06',
  'B8-07': 'S8-07',
  'B8-08': 'S8-08',
}
