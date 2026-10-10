/** 'unverified' — client-only default, used when `registrationVerification`
 *  is absent (never submitted yet). 'passed'/'failed' are the only two
 *  values the Trusted Backend itself ever writes, once per submission. */
export type VehicleRegistrationVerificationStatus = 'unverified' | 'passed' | 'failed'

/** 行照 (registration certificate) OCR verification result — Trusted-Backend-
 * only (written by verifyVehicleRegistrationDocument via Admin SDK, blocked
 * for the client in firestore.rules). Gates VehicleDetailView's "開始新的驗證"
 * button: only status === 'passed' unlocks it.
 *
 * 2026-10: real pass/fail, not a rubber stamp — the backend must actually
 * judge the photo to be a registration document AND read an engine number
 * off it at a reasonable confidence; anything else comes back `failed` with
 * `note` explaining why, so VehicleRegistrationCard.vue can show the reason
 * and invite a retake (see functions/src/services/vehicle-registration
 * .service.ts for the exact pass rule and its own history of the earlier
 * "上傳任意照片即通過" shortcut this replaces). 車身號碼不再由這支流程判斷.
 *
 * 2026-10: two-stage OCR — `method` records whether the local pipeline
 * (OpenCV.js + Tesseract.js, runs in the Cloud Function) was confident
 * enough on its own, or whether it had to fall back to Gemini vision on the
 * full photo. Surfaced in the admin backend so a spike in `gemini` results
 * is visible (it means the local pipeline is struggling on real photos, not
 * just a one-off). */
export interface VehicleRegistrationVerification {
  status: VehicleRegistrationVerificationStatus
  ocrEngineNumber: string | null
  confidence: number | null
  note: string | null
  verifiedAt: number | null
  method?: 'local' | 'gemini'
}

export interface Vehicle {
  id: string

  currentOwnerId: string
  /** Links to a vehicleModels/{id} reference doc — set from
   * VehicleModelSelect.vue's `modelPicked` event (see VehiclesView.vue's
   * handleModelPicked), null for a manually-typed brand/model with no
   * catalog match. */
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
  /** From the picked vehicleModels/{id}'s own 鏈條傳動 flag (see
   * scripts/import-vehicle-models-csv.mjs) — drives whether
   * BasicHealthCheck13.vue's checklist includes the 鏈條 item. `null`/unset
   * for vehicles created via manual entry (no catalog match). */
  hasChain?: boolean | null

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
  /** 2026-10: server-generated redacted preview (FIELD_ROIS visible, rest
   *  painted over — see functions/src/services/registration-ocr.service.ts's
   *  renderMaskedImage) — only produced when scanDocument found a document
   *  shape, so may be absent even when registrationDocumentUrl isn't.
   *  Temporary: admin UI shows this alongside the original for comparison;
   *  the original will eventually stop being shown there at all. */
  registrationDocumentMaskedUrl?: string | null
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
