import { getFirestore } from 'firebase-admin/firestore'
import { VehicleContext } from './types'

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
