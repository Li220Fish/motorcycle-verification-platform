import { getFirestore } from 'firebase-admin/firestore'
import { VehicleContext, VehicleModelKnownIssue, VehicleModelKnownIssuePart } from './types'

/**
 * Same free-text heuristic as the client's inferTransmissionType (src/data/
 * verification/engine-session.ts) — duplicated here deliberately rather than
 * imported, since functions/ is a separate TypeScript project/deploy unit
 * from the Vue app. Backend decides `hasExposedChainSprocket`, never the
 * client (Group C spec §9: "Client 不應自行宣告 hasExposedChainSprocket").
 */
export async function resolveVehicleContext(vehicleId: string): Promise<VehicleContext> {
  const snap = await getFirestore().collection('vehicles').doc(vehicleId).get()
  const transmissionText = (snap.data()?.transmission as string | null | undefined) ?? null

  let transmission: VehicleContext['transmission'] = 'unknown'
  if (transmissionText) {
    if (/cvt|無段|速克達|scooter/i.test(transmissionText)) transmission = 'scooter'
    else if (/手排|檔車|手動|manual/i.test(transmissionText)) transmission = 'manual'
  }

  // Only chain-drive (manual/geared) motorcycles have an exposed chain and
  // sprocket; scooters/CVT vehicles do not (Group C spec §16: "禁止 Agent
  // 讓速可達去拍 CVT 外蓋"). Unknown transmission conservatively defaults to
  // false — the same reasoning as the Group C spec's "沒有可靠欄位" fallback.
  const hasExposedChainSprocket = transmission === 'manual'

  return { transmission, hasExposedChainSprocket }
}

/**
 * 車輛選單資訊（vehicleModels/{id}）通病清單 — only the entries tagged for
 * the ONE Core Vision part actually being analyzed, so a call over
 * left/right side photos never receives an engine-bottom-only issue (and
 * vice versa). Returns `[]` whenever the vehicle has no linked catalog
 * model (`vehicles/{id}.modelId` unset — e.g. a manually-typed brand/model
 * with no catalog match) or that model has no issues tagged for this part.
 * `general`-tagged issues are intentionally never returned by this
 * function at all — see the `VehicleModelKnownIssuePart` doc comment.
 */
export async function resolveKnownIssuesForPart(
  vehicleId: string,
  part: Exclude<VehicleModelKnownIssuePart, 'general'>,
): Promise<string[]> {
  const vehicleSnap = await getFirestore().collection('vehicles').doc(vehicleId).get()
  const modelId = (vehicleSnap.data()?.modelId as string | null | undefined) ?? null
  if (!modelId) return []

  const modelSnap = await getFirestore().collection('vehicleModels').doc(modelId).get()
  if (!modelSnap.exists) return []

  const knownIssues = (modelSnap.data()?.knownIssues ?? []) as VehicleModelKnownIssue[]
  return knownIssues
    .filter((issue) => issue.part === part)
    .map((issue) => issue.description)
    .filter((description) => description.trim().length > 0)
}
