/**
 * Buyer item ID → Seller item ID, for the pairs that have a clear 1:1
 * counterpart across the two flows. Most Buyer items (chat prompts, budget,
 * paperwork prep, ride-safety consensus…) have no Seller equivalent by
 * design — see V0.2 spec §3. Everything else is compared by the buyer's own
 * judgement at B11.
 *
 * The Seller flow was reduced to 73 items across 5 categories (see
 * seller-verification.ts) and no longer has dedicated Voltage-stage items or
 * a 1:1 split of every light/turn-signal — those pairs were dropped rather
 * than mapped to a mismatched granularity. Only the items that still line up
 * cleanly are kept below. Buyer's own flow is unchanged for now, so its
 * remaining lighting/voltage items simply show as "not_checked" until the
 * Seller flow's coverage is revisited.
 */
export const BUYER_TO_SELLER_COMPARISON_MAP: Record<string, string> = {
  'B3-03': 'ENG-08',
  'B8-03': 'ELEC-04',
  'B8-04': 'ELEC-05',
}
