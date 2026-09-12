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

/** 車輛選單資訊 (`vehicleModels/{id}`) 通病清單一筆 — mirrors the client's
 * `VehicleModelKnownIssue` (src/admin/services/admin-data.service.ts) with
 * the same "no shared runtime import across the Cloud Functions/web
 * boundary" duplication used for every other cross-boundary shape in this
 * app. `part` maps 1:1 onto which Core Vision route(s) actually see the
 * relevant photo — 'general' is reference-only and deliberately excluded
 * from every route (see resolveKnownIssuesForPart in
 * vehicle-context.service.ts), since there's no specific evidence view to
 * check it against. */
export type VehicleModelKnownIssuePart =
  | 'sides'
  | 'rear'
  | 'front_suspension'
  | 'engine_bottom'
  | 'general'

export interface VehicleModelKnownIssue {
  id: string
  part: VehicleModelKnownIssuePart
  description: string
}
