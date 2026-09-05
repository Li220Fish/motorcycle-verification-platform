export type VerificationType = 'seller' | 'buyer' | 'professional'

export type VerificationStatus = 'draft' | 'in_progress' | 'completed' | 'needs_review' | 'expired'

export type TransactionDecision = 'continue_considering' | 'need_third_party' | 'not_buying'

/** Trusted-Backend-only (analyze-environment.ts) — Step 3's environment/
 * ambient-audio analysis. Deliberately NOT a vehicle-condition judgement
 * (see PREP-03's own helpText: "不直接影響車況判定結果") — surfaced in the
 * report as informational context on the 驗車環境檢測 item, never as its
 * own result/badge. Loosely typed past `warnings`/`quality` since the report
 * only ever needs those two; the richer visual/audio breakdown is for the
 * admin backend (VerifyDetailSection.vue), not this shared client type. */
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
}

// isPublic/protocolVersion/schemaVersion are stamped by verificationService.create()
// itself, never chosen by the caller — see there. environmentContext/
// coldStateContext are Trusted-Backend-only (firestore.rules blocks the
// client from ever setting them, same reasoning as the others).
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
>
