import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'

import { db } from '@/services/firebase/firebase'
import type { Conversation } from '@/services/chat/chat.types'
import type { DiscussionPost } from '@/services/discussion/discussion.types'
import type { MockMarketListing } from '@/data/home/marketplace-mock'
import type { MockVehicleNews } from '@/data/home/vehicle-news-mock'
import type { ListingAppointment } from '@/types/listing-appointment'
import type { Vehicle } from '@/types/vehicle'
import type { Verification } from '@/types/verification'
import type { VerificationAnswer } from '@/types/verification-evidence'
import type { VoltageSession } from '@/types/voltage-session'

/**
 * Read-only, admin-only Firestore access for the /admin backend — deliberate
 * duplicate of a few conversions the mobile app's own services already do,
 * rather than importing those services directly. The mobile services are
 * scoped to "one signed-in user's own data" (by uid, by vehicle, live
 * subscriptions); the admin backend needs the opposite — everything, in one
 * shot, regardless of owner or status — so sharing them would mean bending
 * their contracts rather than reusing them. Only the underlying data TYPES
 * (Vehicle, Verification, ...) and the Firestore `db` handle are shared.
 */

function toMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis()
  if (typeof value === 'number') return value
  return 0
}

export interface AdminUserProfile {
  uid: string
  email: string
  displayName: string | null
  photoUrl: string | null
  accountTier: string
  createdAt: number
  updatedAt: number
  lastSeenAt: number
}

export async function listUserProfiles(): Promise<AdminUserProfile[]> {
  const snapshot = await getDocs(collection(db, 'users'))
  return snapshot.docs.map((d) => {
    const data = d.data()
    return {
      uid: d.id,
      email: data.email ?? '',
      displayName: data.displayName ?? null,
      photoUrl: data.photoUrl ?? null,
      accountTier: data.accountTier ?? 'standard',
      createdAt: toMillis(data.createdAt),
      updatedAt: toMillis(data.updatedAt),
      lastSeenAt: toMillis(data.lastSeenAt),
    }
  })
}

export async function listAllVehicles(): Promise<Vehicle[]> {
  const snapshot = await getDocs(collection(db, 'vehicles'))
  return snapshot.docs.map((d) => {
    const data = d.data()
    return {
      ...data,
      id: d.id,
      createdAt: toMillis(data.createdAt),
      updatedAt: toMillis(data.updatedAt),
    } as Vehicle
  })
}

export async function listAllVerifications(): Promise<Verification[]> {
  const snapshot = await getDocs(collection(db, 'verifications'))
  return snapshot.docs.map((d) => {
    const data = d.data()
    return {
      ...data,
      id: d.id,
      createdAt: toMillis(data.createdAt),
      completedAt: data.completedAt ? toMillis(data.completedAt) : undefined,
    } as Verification
  })
}

/** `Verification.environmentContext`/`coldStateContext` (Trusted Backend
 * only) are typed narrowly on the shared client type — just what
 * VerificationReportView.vue's own informational note needs. The admin
 * detail view reads/dumps the fuller raw shape (visual/audio breakdown,
 * model, analyzedAt, ...) via inline `as any` casts at each read site rather
 * than widening the shared type for one screen's sake. */
export type AdminVerificationDetail = Verification

export async function getVerificationById(id: string): Promise<AdminVerificationDetail | null> {
  const snapshot = await getDoc(doc(db, 'verifications', id))
  if (!snapshot.exists()) return null
  const data = snapshot.data()
  return {
    ...data,
    id: snapshot.id,
    createdAt: toMillis(data.createdAt),
    completedAt: data.completedAt ? toMillis(data.completedAt) : undefined,
  } as AdminVerificationDetail
}

/** Every answer (including its `aiResult`, per-item AI verdict) for one
 * verification — used by VerifyDetailSection.vue's "AI 回應" drill-down.
 * `updatedAt` is written client-side as a plain millis number
 * (verification.store.ts's saveAnswer()), not a Timestamp — toMillis()
 * already passes a plain number through unchanged, same as it does for the
 * Timestamp case elsewhere in this file. */
export async function listVerificationAnswers(
  verificationId: string,
): Promise<VerificationAnswer[]> {
  const snapshot = await getDocs(collection(db, 'verifications', verificationId, 'answers'))
  return snapshot.docs.map((d) => {
    const data = d.data()
    return { ...data, updatedAt: toMillis(data.updatedAt) } as VerificationAnswer
  })
}

export async function listAllListings(): Promise<MockMarketListing[]> {
  const snapshot = await getDocs(collection(db, 'marketplaceListings'))
  return snapshot.docs.map((d) => {
    const data = d.data()
    return {
      ...(data as unknown as MockMarketListing),
      id: d.id,
      createdAt: toMillis(data.createdAt),
      publishedAt: data.publishedAt ? toMillis(data.publishedAt) : null,
    }
  })
}

/** Every appointment across every listing — small nested read since listing
 * counts are low in this demo; would need a collectionGroup index at scale. */
export async function listAllAppointments(
  listingIds: string[],
): Promise<(ListingAppointment & { listingBrand?: string })[]> {
  const results: (ListingAppointment & { listingBrand?: string })[] = []
  for (const listingId of listingIds) {
    const snapshot = await getDocs(collection(db, 'marketplaceListings', listingId, 'appointments'))
    for (const d of snapshot.docs) {
      const data = d.data()
      results.push({
        id: d.id,
        listingId,
        buyerId: data.buyerId,
        buyerName: data.buyerName,
        scheduledAt: toMillis(data.scheduledAt),
        note: data.note,
        status: data.status ?? 'pending',
        createdAt: toMillis(data.createdAt),
      })
    }
  }
  return results
}

export async function listAllConversations(): Promise<Conversation[]> {
  const snapshot = await getDocs(collection(db, 'conversations'))
  return snapshot.docs.map((d) => {
    const data = d.data()
    return {
      ...data,
      id: d.id,
      lastMessageAt: toMillis(data.lastMessageAt),
      createdAt: toMillis(data.createdAt),
      updatedAt: toMillis(data.updatedAt),
    } as Conversation
  })
}

export async function listAllPosts(): Promise<DiscussionPost[]> {
  const snapshot = await getDocs(collection(db, 'discussionPosts'))
  return snapshot.docs.map((d) => {
    const data = d.data()
    return {
      ...data,
      id: d.id,
      createdAt: toMillis(data.createdAt),
      updatedAt: toMillis(data.updatedAt),
    } as DiscussionPost
  })
}

export interface AdminReport {
  id: string
  reporterId: string
  targetType: 'post' | 'comment' | 'user'
  targetId: string
  reason: string
  status: 'pending' | 'resolved' | 'dismissed'
  createdAt: number
}

export async function listAllReports(): Promise<AdminReport[]> {
  const snapshot = await getDocs(collection(db, 'discussionReports'))
  return snapshot.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      reporterId: data.reporterId,
      targetType: data.targetType,
      targetId: data.targetId,
      reason: data.reason,
      status: data.status ?? 'pending',
      createdAt: toMillis(data.createdAt),
    }
  })
}

export async function resolveReport(reportId: string): Promise<void> {
  await updateDoc(doc(db, 'discussionReports', reportId), { status: 'resolved' })
}

export async function dismissReport(reportId: string): Promise<void> {
  await updateDoc(doc(db, 'discussionReports', reportId), { status: 'dismissed' })
}

export async function hidePost(postId: string): Promise<void> {
  await updateDoc(doc(db, 'discussionPosts', postId), { status: 'hidden' })
}

export async function listAllVehicleNews(): Promise<MockVehicleNews[]> {
  const snapshot = await getDocs(collection(db, 'vehicleNews'))
  return snapshot.docs.map((d) => {
    const data = d.data()
    const publishedAt = data.publishedAt
    return {
      id: d.id,
      title: data.title ?? '',
      summary: data.summary,
      category: data.category ?? '',
      coverImageUrl: data.coverImageUrl ?? null,
      sourceName: data.sourceName ?? '',
      sourceUrl: data.sourceUrl ?? null,
      content: data.content ?? '',
      publishedAt:
        publishedAt instanceof Timestamp ? publishedAt.toMillis() : toMillis(publishedAt),
    } as MockVehicleNews
  })
}

export async function createVehicleNews(
  news: Omit<MockVehicleNews, 'id' | 'publishedAt'>,
): Promise<void> {
  await addDoc(collection(db, 'vehicleNews'), { ...news, publishedAt: serverTimestamp() })
}

export async function deleteVehicleNews(id: string): Promise<void> {
  await deleteDoc(doc(db, 'vehicleNews', id))
}

/** Written but never actually read back anywhere in the mobile app today —
 * see docs/admin-backend.md's gap list. This is real data if/when a probe
 * measurement session ever gets persisted; currently always empty. */
export async function listAllVoltageSessions(): Promise<VoltageSession[]> {
  const snapshot = await getDocs(collection(db, 'voltageSessions'))
  return snapshot.docs.map((d) => {
    const data = d.data()
    return {
      ...data,
      id: d.id,
      startedAt: toMillis(data.startedAt),
      endedAt: data.endedAt ? toMillis(data.endedAt) : undefined,
    } as VoltageSession
  })
}

// --- New admin-only collections (see docs/admin-backend.md) ---

export type VehiclePowerType = 'gasoline' | 'electric'

/** spec §19's full nested shape. Only a subset of leaves have admin-form
 * inputs today (engine basics, dimensions, efficiency, ABS/TCS/CBS) — the
 * rest default to null/false so the document is always fully spec-shaped
 * even though nothing writes those leaves yet. See docs/admin-backend.md. */
export interface VehicleModelSpecs {
  engine: {
    coolingType: string | null
    cylinderCount: number | null
    valveTrain: string | null
    valvesPerCylinder: number | null
    compressionRatio: string | null
    maxPowerHp: number | null
    maxPowerRpm: number | null
    maxTorqueKgm: number | null
    maxTorqueRpm: number | null
    fuelSystem: string | null
    startSystem: string | null
    fuelTankCapacityL: number | null
  }
  electric: {
    motorPowerW: number | null
    motorPowerRpm: number | null
    batteryCount: number | null
  }
  dimensions: {
    lengthMm: number | null
    widthMm: number | null
    heightMm: number | null
    seatHeightMm: number | null
    wheelbaseMm: number | null
    weightKg: number | null
  }
  chassis: {
    frontTireSize: string | null
    rearTireSize: string | null
    frontBrakeType: string | null
    rearBrakeType: string | null
  }
  safety: {
    abs: boolean
    tcs: boolean
    cbs: boolean
  }
  efficiency: {
    officialCityKmPerL: number | null
    officialHighwayKmPerL: number | null
    officialAverageKmPerL: number | null
    officialRangeKm: number | null
  }
}

/** spec §19's feature flags — schema-ready, no admin-form input for any of
 * these yet (always defaults). */
export interface VehicleModelFeatures {
  convenience: { keyless: boolean; usbCharging: boolean; idleStop: boolean; reverseAssist: boolean }
  display: { displayType: string | null; smartphoneConnect: boolean; navigationSupport: boolean }
  lighting: {
    ledHeadlight: boolean
    ledTaillight: boolean
    ledTurnSignals: boolean
    hazardLights: boolean
  }
  storage: { underSeatStorageL: number | null; frontStorage: boolean }
  security: { immobilizer: boolean; antiTheftAlarm: boolean }
}

export interface AdminVehicleModel {
  id: string
  brand: string
  series: string
  modelYear: number | null
  trimName: string | null
  bodyType: string | null
  powerType: VehiclePowerType
  displacementCc: number | null
  transmission: string | null
  coverImageUrl: string | null
  photos: string[]
  specs: VehicleModelSpecs
  features: VehicleModelFeatures
  /** Truth = vehicleModels/{id}/fuelReports subcollection (spec §20) — no
   * mobile-app flow computes/writes one yet, so this is always the default. */
  realFuelStats: { averageKmPerL: number | null; vehicleCount: number }
  /** Truth = vehicleModels/{id}/reviews subcollection (spec §20) — same gap. */
  reviewStats: { averageRating: number | null; reviewCount: number }
  createdAt: number
}

const EMPTY_SPECS: VehicleModelSpecs = {
  engine: {
    coolingType: null,
    cylinderCount: null,
    valveTrain: null,
    valvesPerCylinder: null,
    compressionRatio: null,
    maxPowerHp: null,
    maxPowerRpm: null,
    maxTorqueKgm: null,
    maxTorqueRpm: null,
    fuelSystem: null,
    startSystem: null,
    fuelTankCapacityL: null,
  },
  electric: { motorPowerW: null, motorPowerRpm: null, batteryCount: null },
  dimensions: {
    lengthMm: null,
    widthMm: null,
    heightMm: null,
    seatHeightMm: null,
    wheelbaseMm: null,
    weightKg: null,
  },
  chassis: {
    frontTireSize: null,
    rearTireSize: null,
    frontBrakeType: null,
    rearBrakeType: null,
  },
  safety: { abs: false, tcs: false, cbs: false },
  efficiency: {
    officialCityKmPerL: null,
    officialHighwayKmPerL: null,
    officialAverageKmPerL: null,
    officialRangeKm: null,
  },
}

const EMPTY_FEATURES: VehicleModelFeatures = {
  convenience: { keyless: false, usbCharging: false, idleStop: false, reverseAssist: false },
  display: { displayType: null, smartphoneConnect: false, navigationSupport: false },
  lighting: {
    ledHeadlight: false,
    ledTaillight: false,
    ledTurnSignals: false,
    hazardLights: false,
  },
  storage: { underSeatStorageL: null, frontStorage: false },
  security: { immobilizer: false, antiTheftAlarm: false },
}

export async function listVehicleModels(): Promise<AdminVehicleModel[]> {
  const snapshot = await getDocs(collection(db, 'vehicleModels'))
  return snapshot.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      brand: data.brand ?? '',
      series: data.series ?? '',
      modelYear: data.modelYear ?? null,
      trimName: data.trimName ?? null,
      bodyType: data.bodyType ?? null,
      powerType: data.powerType ?? 'gasoline',
      displacementCc: data.displacementCc ?? null,
      transmission: data.transmission ?? null,
      coverImageUrl: data.coverImageUrl ?? null,
      photos: data.photos ?? [],
      specs: { ...EMPTY_SPECS, ...data.specs },
      features: { ...EMPTY_FEATURES, ...data.features },
      realFuelStats: data.realFuelStats ?? { averageKmPerL: null, vehicleCount: 0 },
      reviewStats: data.reviewStats ?? { averageRating: null, reviewCount: 0 },
      createdAt: toMillis(data.createdAt),
    }
  })
}

export interface CreateVehicleModelInput {
  brand: string
  series: string
  modelYear: number | null
  trimName: string | null
  bodyType: string | null
  powerType: VehiclePowerType
  displacementCc: number | null
  transmission: string | null
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

export async function createVehicleModel(input: CreateVehicleModelInput): Promise<void> {
  const specs: VehicleModelSpecs = {
    ...EMPTY_SPECS,
    engine: {
      ...EMPTY_SPECS.engine,
      maxPowerHp: input.specs.maxPowerHp,
      maxTorqueKgm: input.specs.maxTorqueKgm,
      fuelTankCapacityL: input.specs.fuelTankCapacityL,
    },
    electric: { ...EMPTY_SPECS.electric, motorPowerW: input.specs.motorPowerW },
    dimensions: {
      ...EMPTY_SPECS.dimensions,
      weightKg: input.specs.weightKg,
      seatHeightMm: input.specs.seatHeightMm,
    },
    safety: { abs: input.specs.abs, tcs: input.specs.tcs, cbs: input.specs.cbs },
    efficiency: {
      ...EMPTY_SPECS.efficiency,
      officialAverageKmPerL: input.specs.officialAverageKmPerL,
    },
  }
  await addDoc(collection(db, 'vehicleModels'), {
    brand: input.brand,
    series: input.series,
    modelYear: input.modelYear,
    trimName: input.trimName,
    bodyType: input.bodyType,
    powerType: input.powerType,
    displacementCc: input.displacementCc,
    transmission: input.transmission,
    coverImageUrl: null,
    photos: [],
    specs,
    features: EMPTY_FEATURES,
    realFuelStats: { averageKmPerL: null, vehicleCount: 0 },
    reviewStats: { averageRating: null, reviewCount: 0 },
    createdAt: serverTimestamp(),
  })
}

export async function deleteVehicleModel(id: string): Promise<void> {
  await deleteDoc(doc(db, 'vehicleModels', id))
}
