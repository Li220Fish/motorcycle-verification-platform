import { collection, doc, getDoc, getDocs } from 'firebase/firestore'

import { db } from './firebase'
import type { HealthCheckAnchor } from '@/data/verification/basic-health-check-items'

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

/** Just enough of a vehicleModels/{id} doc for BasicHealthCheck13.vue to
 *  render its per-model photo + marker layer — see admin/sections/
 *  HealthCheckSection.vue for how these get admin-edited. */
export interface VehicleModelHealthCheckData {
  coverImageUrl: string | null
  hasChain: boolean
  healthCheckAnchors: Record<string, HealthCheckAnchor> | null
}

async function getHealthCheckData(modelId: string): Promise<VehicleModelHealthCheckData | null> {
  const snapshot = await getDoc(doc(db, COLLECTION, modelId))
  if (!snapshot.exists()) return null
  const data = snapshot.data()
  return {
    coverImageUrl: data.coverImageUrl ?? null,
    hasChain: !!data.hasChain,
    healthCheckAnchors: data.healthCheckAnchors ?? null,
  }
}

export const vehicleModelService = { listAll, getHealthCheckData }
