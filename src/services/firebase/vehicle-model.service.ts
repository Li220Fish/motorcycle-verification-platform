import { collection, getDocs } from 'firebase/firestore'

import { db } from './firebase'

const COLLECTION = 'vehicleModels'

/**
 * Read-only mobile-app access to the `vehicleModels` reference collection —
 * previously only reachable via the admin backend's own service
 * (src/admin/services/admin-data.service.ts). This is a much narrower shape
 * than AdminVehicleModel: just enough for a brand/model Search Select with a
 * manual-input fallback (Task B4), not the full admin spec schema.
 */
export interface VehicleModelOption {
  id: string
  brand: string
  /** "車型" in mobile-app copy — same field admin-data.service.ts calls `series`. */
  model: string
  displacementCc: number | null
  transmission: string | null
}

async function listAll(): Promise<VehicleModelOption[]> {
  const snapshot = await getDocs(collection(db, COLLECTION))
  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data()
    return {
      id: docSnapshot.id,
      brand: data.brand ?? '',
      model: data.series ?? '',
      displacementCc: data.displacementCc ?? null,
      transmission: data.transmission ?? null,
    }
  })
}

export const vehicleModelService = { listAll }
