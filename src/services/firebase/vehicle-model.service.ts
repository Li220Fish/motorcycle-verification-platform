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

/** Mirrors admin-data.service.ts's VehicleModelKnownIssuePart — duplicated
 * per this project's convention of not sharing types between the admin
 * backend and the mobile app. */
export type VehicleModelKnownIssuePart =
  'sides' | 'rear' | 'front_suspension' | 'engine_bottom' | 'general'

export interface VehicleModelKnownIssue {
  id: string
  part: VehicleModelKnownIssuePart
  description: string
}

/**
 * Full-ish read shape for 討論中心「車輛資訊」— every leaf that the admin
 * form (src/admin/sections/ModelsSection.vue) actually has an input for
 * today. The rest of AdminVehicleModel's spec tree (coolingType, valveTrain,
 * chassis.*, features.*, ...) has no admin input yet and is always
 * null/false, so it's left out here rather than displayed as empty rows.
 */
export interface VehicleModelProfile {
  id: string
  brand: string
  series: string
  modelYear: number | null
  trimName: string | null
  bodyType: string | null
  powerType: 'gasoline' | 'electric'
  displacementCc: number | null
  transmission: string | null
  hasChain: boolean
  synonyms: string[]
  knownIssues: VehicleModelKnownIssue[]
  /** 二手價區間 (TWD) — admin-entered reference range (ModelsSection.vue),
   *  shown as the last section of a verification report (see
   *  useInspectionReportSections.ts). null when the admin hasn't set one. */
  usedPriceRangeTwd: { min: number; max: number } | null
  coverImageUrl: string | null
  photos: string[]
  specs: {
    maxPowerHp: number | null
    maxTorqueKgm: number | null
    fuelTankCapacityL: number | null
    motorPowerW: number | null
    weightKg: number | null
    seatHeightMm: number | null
    officialAverageKmPerL: number | null
    abs: boolean
    tcs: boolean
    cbs: boolean
  }
}

function toProfile(id: string, data: Record<string, unknown>): VehicleModelProfile {
  const specs = (data.specs ?? {}) as Record<string, Record<string, unknown> | undefined>
  const engine = specs.engine ?? {}
  const electric = specs.electric ?? {}
  const dimensions = specs.dimensions ?? {}
  const safety = specs.safety ?? {}
  const efficiency = specs.efficiency ?? {}

  return {
    id,
    brand: (data.brand as string) ?? '',
    series: (data.series as string) ?? '',
    modelYear: (data.modelYear as number | null) ?? null,
    trimName: (data.trimName as string | null) ?? null,
    bodyType: (data.bodyType as string | null) ?? null,
    powerType: (data.powerType as 'gasoline' | 'electric') ?? 'gasoline',
    displacementCc: (data.displacementCc as number | null) ?? null,
    transmission: (data.transmission as string | null) ?? null,
    hasChain: !!data.hasChain,
    synonyms: (data.synonyms as string[]) ?? [],
    knownIssues: (data.knownIssues as VehicleModelKnownIssue[]) ?? [],
    usedPriceRangeTwd:
      (data.usedPriceRangeTwd as { min: number; max: number } | null | undefined) ?? null,
    coverImageUrl: (data.coverImageUrl as string | null) ?? null,
    photos: (data.photos as string[]) ?? [],
    specs: {
      maxPowerHp: (engine.maxPowerHp as number | null) ?? null,
      maxTorqueKgm: (engine.maxTorqueKgm as number | null) ?? null,
      fuelTankCapacityL: (engine.fuelTankCapacityL as number | null) ?? null,
      motorPowerW: (electric.motorPowerW as number | null) ?? null,
      weightKg: (dimensions.weightKg as number | null) ?? null,
      seatHeightMm: (dimensions.seatHeightMm as number | null) ?? null,
      officialAverageKmPerL: (efficiency.officialAverageKmPerL as number | null) ?? null,
      abs: !!safety.abs,
      tcs: !!safety.tcs,
      cbs: !!safety.cbs,
    },
  }
}

async function listProfiles(): Promise<VehicleModelProfile[]> {
  const snapshot = await getDocs(collection(db, COLLECTION))
  return snapshot.docs.map((docSnapshot) => toProfile(docSnapshot.id, docSnapshot.data()))
}

async function getProfile(id: string): Promise<VehicleModelProfile | null> {
  const snapshot = await getDoc(doc(db, COLLECTION, id))
  if (!snapshot.exists()) return null
  return toProfile(snapshot.id, snapshot.data())
}

function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9一-鿿]/g, '')
}

/**
 * Best-effort fallback for a vehicle/listing with no `modelId` link — i.e.
 * its brand/model were typed as free text rather than picked from this
 * catalog via VehicleModelSelect.vue. Requires an exact (normalized) brand
 * match, then an EXACT (normalized) match against the candidate's trimName,
 * series, series+trimName concatenated, or a synonym — brand alone is never
 * enough, since that would link to an arbitrary model of the same brand.
 *
 * Deliberately exact rather than substring/prefix: an earlier version used
 * `.includes()`, which let e.g. model text "Mt03" match a YAMAHA MT-09
 * catalog entry too (its series "MT" is a substring of "mt03") — found via a
 * real listing during manual testing. A false "probably this model" link is
 * worse than no link at all, so this only returns a hit when the normalized
 * text lines up exactly with one specific field, never a loose overlap.
 * Consequently a model string with extra words (e.g. "MT-03 ABS版") won't
 * match — that's an accepted miss, not a bug to chase.
 */
function findModelIdByText(
  brand: string,
  model: string,
  profiles: VehicleModelProfile[],
): string | null {
  const brandNorm = normalizeForMatch(brand)
  const modelNorm = normalizeForMatch(model)
  if (!brandNorm || !modelNorm) return null

  const sameBrand = profiles.filter((profile) => normalizeForMatch(profile.brand) === brandNorm)

  for (const profile of sameBrand) {
    if (profile.trimName && normalizeForMatch(profile.trimName) === modelNorm) return profile.id
  }
  for (const profile of sameBrand) {
    if (normalizeForMatch(profile.series) === modelNorm) return profile.id
  }
  for (const profile of sameBrand) {
    if (normalizeForMatch(profile.series + (profile.trimName ?? '')) === modelNorm) {
      return profile.id
    }
  }
  for (const profile of sameBrand) {
    if (profile.synonyms.some((synonym) => normalizeForMatch(synonym) === modelNorm)) {
      return profile.id
    }
  }
  return null
}

export const vehicleModelService = {
  listAll,
  listProfiles,
  getProfile,
  findModelIdByText,
  getHealthCheckData,
}
