/**
 * v1 EXPERIMENTAL scoring rules for users/{uid}.score (交易評分) — none of
 * these weights are calibrated against real outcome data yet, same
 * "centralize, don't scatter, say so explicitly" discipline as
 * imu-thresholds-v1.ts. Do not present these as tuned/validated in any UI.
 *
 * Design (per product direction, 2026-10): everyone starts at 0
 * (user-profile.service.ts already does this). Two independent sources ever
 * move it, both Trusted-Backend-only (firestore.rules' `score` guard):
 *
 * 1. DISCLOSURE COMPARISON (the dominant signal) — fires once, the moment a
 *    買家複驗 (Verification.type === 'buyer') with a `relatedVerificationId`
 *    transitions to `status: 'completed'`. Walks every item both the seller
 *    verification and the buyer re-verification answered, and scores the
 *    SELLER (never the buyer) on whether their original disclosure held up:
 *      - seller said 正常/不適用, buyer independently found 需要注意
 *        → 揭露不實 (undisclosed issue) → DISCLOSURE_MISS_DELTA (negative,
 *        the only negative case this mechanic produces)
 *      - seller and buyer's results agree exactly → 覆核一致 →
 *        DISCLOSURE_MATCH_DELTA (positive)
 *      - anything else (e.g. seller flagged 需要注意 but the buyer's re-check
 *        came back 正常 — the seller was cautious, not dishonest; or either
 *        side is 不確定/不適用) → neutral, not counted. A cautious seller is
 *        never penalized for over-disclosing.
 *    See functions/src/functions/score/on-buyer-verification-completed.ts.
 *
 * 2. APPOINTMENT KEPT (a small, flat bonus) — fires once, when a seller
 *    marks an approved appointment `completed` (MyListingManageView.vue, 已
 *    predates/post-dates nothing — this is an honor-system confirmation, not
 *    a verified check-in; see that trigger file's own caveat). Both the
 *    buyer and the seller each get the same small flat bonus — showing up is
 *    a two-way courtesy, not something only one side is judged on.
 *    See functions/src/functions/score/on-appointment-completed.ts.
 *
 * "佔大部分" is enforced simply by magnitude: a single disclosure event
 * moves the score several times further than a single kept appointment.
 */
export const SCORE_RULES_VERSION = 'score-rules-v1'

export const SCORE_CONFIG = {
  /** Per item where the seller's original answer matched what the buyer's
   *  independent re-check found (正常=正常 or 需要注意=需要注意). */
  disclosureMatchDelta: 2,
  /** Per item where the seller said 正常/不適用 but the buyer's re-check
   *  found 需要注意 — the one case this mechanic treats as a disclosure
   *  miss. The only negative delta in the whole mechanic, weighted heavier
   *  than a match on purpose: a missed defect costs the buyer real money,
   *  so it should cost the seller more than one honest match earns back. */
  disclosureMissDelta: -5,
  /** Flat bonus, same for both parties, when an appointment is confirmed
   *  kept. Deliberately much smaller than either disclosure delta above —
   *  "赴約上可能就會有一點點的分數" — showing up is baseline courtesy, not
   *  the thing this score is mainly meant to measure. */
  appointmentKeptDelta: 1,
} as const
