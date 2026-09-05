export interface VerificationDoc {
  id: string
  vehicleId: string
  userId: string
  type: 'seller' | 'buyer' | 'professional'
  status: string
  isPublic: boolean
}

export interface VehicleDoc {
  id: string
  currentOwnerId: string
  transmission?: string | null
}

export interface VehicleContext {
  transmission: 'scooter' | 'manual' | 'unknown'
  hasExposedChainSprocket: boolean
}
