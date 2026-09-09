import { collection, getDocs } from 'firebase/firestore'

import { db } from './firebase'

const COLLECTION = 'vehicleModels'

/**
 * Read-only mobile-app access to the `vehicleModels` reference collection —
 * previously only reachable via the admin backend's own service
 * (src/admin/services/admin-data.service.ts). This is a much narrower shape
 * than AdminVehicleModel: just enough for the 廠牌/車系/排氣量/名稱 cascading
 * select with a manual-input fallback (VehicleModelSelect.vue), not the full
 * admin spec schema.
 */
export interface VehicleModelOption {
  id: string
  brand: string
  series: string
  /** "名稱" in mobile-app copy — admin-data.service.ts's `trimName`. */
  name: string
  displacementCc: number | null
  transmission: string | null
  hasChain: boolean
}

async function listAll(): Promise<VehicleModelOption[]> {
  const snapshot = await getDocs(collection(db, COLLECTION))
  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data()
    return {
      id: docSnapshot.id,
      brand: data.brand ?? '',
      series: data.series ?? '',
      name: data.trimName ?? '',
      displacementCc: data.displacementCc ?? null,
      transmission: data.transmission ?? null,
      hasChain: !!data.hasChain,
    }
  })
}

export const vehicleModelService = { listAll }
