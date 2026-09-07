export type VerificationType = 'seller' | 'buyer' | 'professional'

export type VerificationStatus = 'draft' | 'in_progress' | 'completed' | 'needs_review' | 'expired'

export type TransactionDecision = 'continue_considering' | 'need_third_party' | 'not_buying'

/** Historical-only: Step 3 (驗車環境檢測/PREP-03) and its Trusted-Backend
 * analysis were removed from the product entirely (no longer part of
 * Verification v2's item registry, no Cloud Function writes this anymore).
 * This type is kept solely so already-completed verifications that captured
 * it before the removal still type-check when read — see
 * VerifyDetailSection.vue's admin-only historical viewer, the only place
 * that still reads this field. Never written to for new verifications. */
export interface EnvironmentContext {
  quality: { overallSuitable: boolean; visualSuitable: boolean; audioSuitable: boolean }
  warnings: string[]
}

/** Trusted-Backend-only (analyze-cold-engine-touch.ts) — mirrors ENG-02's
 * own Answer.aiResult (which already carries a real note), kept here mainly
 * so engine-sensor-session.service.ts's coldStateValid stamping logic has
 * something to read; the report doesn't need to show this separately since
 * ENG-02's own answer already renders. */
export interface ColdStateContext {
  coldStateValid: boolean
}

/** Verification v2 — Trusted-Backend-only, one entry per background AI
 * route ('coreVision' | 'dashboardOcr' | 'coldCheck' | 'engineSensorSession').
 * Fixes a real gap: every AI call used to be client fire-and-forget with a
 * swallowed `.catch(() => {})`, so a Gemini 429/5xx/timeout/schema failure
 * left no trace anywhere — no failed Answer, no retry affordance, nothing.
 * Each Cloud Function now stamps 'processing' before calling Gemini and
 * 'completed'/'failed' after, so the client can tell "still analyzing" from
 * "genuinely failed, offer retry" instead of silence forever. */
export interface AnalysisStatusEntry {
  status: 'processing' | 'completed' | 'failed'
  updatedAt: number
  error?: string
}
export type AnalysisStatusMap = Record<string, AnalysisStatusEntry>

/**
 * A Verification always belongs to a Vehicle (via vehicleId), never to a
 * Seller/Buyer account — the same vehicle accumulates many verifications
 * over time (2026, 2027, 2028, ...) regardless of who performed them.
 */
export interface Verification {
  id: string

  vehicleId: string
  userId: string

  type: VerificationType
  status: VerificationStatus

  mileage?: number

  /** Buyer only: the Seller Verification this re-verification compares against. */
  relatedVerificationId?: string
  /** Buyer only: saved from the Transaction Decision step (§59) — no payment/contract flow. */
  transactionDecision?: TransactionDecision

  /** Whether this verification (and its answers/evidence) is readable by any
   * signed-in user, not just its creator/vehicle owner/admin — flipped
   * true, one-way, when a marketplaceListing carrying this verification is
   * published (see listingService.publish()). Never flips back to false. */
  isPublic: boolean
  protocolVersion: number
  schemaVersion: number

  createdAt: number
  completedAt?: number
  /** Reserved for future validity-window rules (§43) — not enforced in V0.2. */
  expiresAt?: number

  environmentContext?: EnvironmentContext
  coldStateContext?: ColdStateContext
  analysisStatus?: AnalysisStatusMap
}

// isPublic/protocolVersion/schemaVersion are stamped by verificationService.create()
// itself, never chosen by the caller — see there. environmentContext/
// coldStateContext/analysisStatus are Trusted-Backend-only (firestore.rules
// blocks the client from ever setting them, same reasoning as the others).
export type VerificationDraft = Omit<
  Verification,
  | 'id'
  | 'createdAt'
  | 'completedAt'
  | 'isPublic'
  | 'protocolVersion'
  | 'schemaVersion'
  | 'environmentContext'
  | 'coldStateContext'
  | 'analysisStatus'
>
