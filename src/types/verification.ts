export type VerificationType = 'seller' | 'buyer' | 'professional'

export type VerificationStatus = 'draft' | 'in_progress' | 'completed' | 'needs_review' | 'expired'

export type TransactionDecision = 'continue_considering' | 'need_third_party' | 'not_buying'

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

  createdAt: number
  completedAt?: number
  /** Reserved for future validity-window rules (§43) — not enforced in V0.2. */
  expiresAt?: number
}

export type VerificationDraft = Omit<Verification, 'id' | 'createdAt' | 'completedAt'>
