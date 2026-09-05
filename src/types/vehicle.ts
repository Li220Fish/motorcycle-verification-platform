export type VehicleRegistrationVerificationStatus = 'unverified' | 'passed' | 'attention'

/** 行照 (registration certificate) OCR verification result — Trusted-Backend-
 * only (written by verifyVehicleRegistrationDocument via Admin SDK, blocked
 * for the client in firestore.rules). Gates VehicleDetailView's "開始新的驗證"
 * button: only status === 'passed' unlocks it. */
export interface VehicleRegistrationVerification {
  status: VehicleRegistrationVerificationStatus
  method: 'ocr' | 'test-bypass' | null
  inputNumber: string | null
  ocrEngineNumber: string | null
  ocrChassisNumber: string | null
  confidence: number | null
  note: string | null
  verifiedAt: number | null
}

export interface Vehicle {
  id: string

  currentOwnerId: string
  /** Links to a vehicleModels/{id} reference doc — no model-picker UI wires
   * this yet, reserved for when one exists. */
  modelId?: string | null

  brand: string
  model: string
  manufactureYear: number | null
  mileage: number | null

  registrationDate?: number | null
  displacementCc?: number | null
  transmission?: string | null
  color?: string | null
  modified?: boolean
  modificationNote?: string | null

  licensePlate?: string

  /** The vehicle's unique physical identity. The 45-step checklist has no
   * dedicated capture step for these anymore (its old PREP-01 vehicle-
   * identity form was dropped) — set via Vehicle edit instead, whenever
   * that exists. Not currently enforced before a verification can be
   * completed/archived. */
  engineNumber?: string | null
  chassisNumber?: string | null

  /** Hero + gallery photos — hotlinked URLs for MOCK/demo vehicles today; a
   * real upload flow would populate this with Firebase Storage paths. */
  photos: string[]
  registrationDocumentUrl?: string | null
  registrationVerification?: VehicleRegistrationVerification

  /** Manual garage order (VehiclesView's long-press-drag reorder) — lower
   * sorts first. `null`/unset means "never manually reordered": those
   * vehicles fall back to newest-first and sort after every vehicle that
   * does have one (see vehicle.service.ts's list()). Index 0 after sorting
   * is what HomeContent.vue features on the status card. */
  sortOrder?: number | null

  createdAt: number
  updatedAt: number
}

export type VehicleDraft = Omit<
  Vehicle,
  'id' | 'createdAt' | 'updatedAt' | 'currentOwnerId' | 'sortOrder' | 'registrationVerification'
>
