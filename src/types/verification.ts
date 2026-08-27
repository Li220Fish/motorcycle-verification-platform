export type VerificationType = 'seller' | 'buyer' | 'professional'

export type VerificationStatus = 'draft' | 'completed'

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

  createdAt: number
  completedAt?: number
}

export type VerificationDraft = Omit<Verification, 'id' | 'createdAt' | 'completedAt'>
