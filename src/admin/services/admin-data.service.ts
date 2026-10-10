import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  DocumentReference,
  getDoc,
  getDocs,
  increment,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'

import { auth, db, functions } from '@/services/firebase/firebase'
import type { HealthCheckAnchor } from '@/data/verification/basic-health-check-items'
import type { Conversation } from '@/services/chat/chat.types'
import type { DiscussionPost } from '@/services/discussion/discussion.types'
import type { MockMarketListing } from '@/data/home/marketplace-mock'
import type { MockVehicleNews } from '@/data/home/vehicle-news-mock'
import type { ListingAppointment } from '@/types/listing-appointment'
import type { Vehicle } from '@/types/vehicle'
import type { Verification } from '@/types/verification'
import type { VerificationAnswer, VerificationEvidence } from '@/types/verification-evidence'
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
  /** 交易評分 — everyone starts at 0 (user-profile.service.ts's
   *  touchUserProfile), only ever moved by a Trusted Backend (see
   *  functions/src/services/score.config.ts for the full mechanic — a
   *  buyer/seller disclosure comparison, or a confirmed-kept appointment).
   *  Locked against self-edit in firestore.rules; see listScoreEvents
   *  below for this account's own per-delta audit trail. */
  score: number
  createdAt: number
  updatedAt: number
  lastSeenAt: number
}

const CASCADE_BATCH_SIZE = 400

async function deleteRefsInBatches(refs: DocumentReference[]): Promise<void> {
  for (let i = 0; i < refs.length; i += CASCADE_BATCH_SIZE) {
    const batch = writeBatch(db)
    for (const ref of refs.slice(i, i + CASCADE_BATCH_SIZE)) batch.delete(ref)
    await batch.commit()
  }
}

export interface UserCascadeDeleteSummary {
  vehicles: number
  verifications: number
  listings: number
  posts: number
  comments: number
}

/**
 * Retires a user account AND every piece of content that only makes sense
 * tied to it: vehicles (+ their fuelLogs/maintenanceLogs), verifications
 * (+ answers/evidence) either performed by this uid or on one of its
 * vehicles, marketplace listings, discussion posts (+ their comments/
 * likes), and this uid's own comments left on OTHER people's surviving
 * posts. Mirrors the vehicle/verification cascade already established in
 * scripts/purge-fake-verification-data.mjs and scripts/cleanup-database.mjs,
 * extended to listings/posts/comments per the same "leave nothing orphaned"
 * rule. Does not touch the underlying Firebase Auth account — the client
 * SDK has no "admin deletes another user's Auth account" API (self-delete
 * only).
 *
 * This uid's comments on posts it didn't author are found by scanning every
 * surviving post's own `comments` subcollection and filtering client-side,
 * not a `collectionGroup` query — there's no collection-group index on
 * `comments` in firestore.indexes.json, and this admin backend's existing
 * convention throughout is "read the whole collection, filter client-side"
 * rather than adding a new index for one admin action.
 */
export async function deleteUserCascade(uid: string): Promise<UserCascadeDeleteSummary> {
  const [vehiclesSnap, verificationsSnap, listingsSnap, postsSnap] = await Promise.all([
    getDocs(collection(db, 'vehicles')),
    getDocs(collection(db, 'verifications')),
    getDocs(collection(db, 'marketplaceListings')),
    getDocs(collection(db, 'discussionPosts')),
  ])

  const ownedVehicleIds = new Set(
    vehiclesSnap.docs.filter((d) => d.data().currentOwnerId === uid).map((d) => d.id),
  )
  const targetVerifications = verificationsSnap.docs.filter(
    (d) => d.data().userId === uid || ownedVehicleIds.has(d.data().vehicleId),
  )
  const targetListings = listingsSnap.docs.filter(
    (d) => d.data().sellerId === uid || ownedVehicleIds.has(d.data().vehicleId),
  )
  const targetPosts = postsSnap.docs.filter((d) => d.data().authorId === uid)
  const targetPostIds = new Set(targetPosts.map((d) => d.id))

  // Verification subcollections (answers/evidence) — deepest first.
  const verificationSubRefs: DocumentReference[] = []
  for (const v of targetVerifications) {
    const [answers, evidence] = await Promise.all([
      getDocs(collection(db, 'verifications', v.id, 'answers')),
      getDocs(collection(db, 'verifications', v.id, 'evidence')),
    ])
    verificationSubRefs.push(...answers.docs.map((d) => d.ref), ...evidence.docs.map((d) => d.ref))
  }
  await deleteRefsInBatches(verificationSubRefs)
  await deleteRefsInBatches(targetVerifications.map((d) => d.ref))

  // Vehicle subcollections (fuelLogs/maintenanceLogs), then the vehicles.
  const vehicleSubRefs: DocumentReference[] = []
  for (const vehicleId of ownedVehicleIds) {
    const [fuelLogs, maintenanceLogs] = await Promise.all([
      getDocs(collection(db, 'vehicles', vehicleId, 'fuelLogs')),
      getDocs(collection(db, 'vehicles', vehicleId, 'maintenanceLogs')),
    ])
    vehicleSubRefs.push(
      ...fuelLogs.docs.map((d) => d.ref),
      ...maintenanceLogs.docs.map((d) => d.ref),
    )
  }
  await deleteRefsInBatches(vehicleSubRefs)
  await deleteRefsInBatches([...ownedVehicleIds].map((id) => doc(db, 'vehicles', id)))

  // Listing subcollection (appointments), then the listings themselves.
  const listingSubRefs: DocumentReference[] = []
  for (const listing of targetListings) {
    const appointments = await getDocs(
      collection(db, 'marketplaceListings', listing.id, 'appointments'),
    )
    listingSubRefs.push(...appointments.docs.map((d) => d.ref))
  }
  await deleteRefsInBatches(listingSubRefs)
  await deleteRefsInBatches(targetListings.map((d) => d.ref))

  // Posts authored by this uid: wipe their comments+likes, then the post.
  const ownPostCommentRefs: DocumentReference[] = []
  const ownPostLikeRefs: DocumentReference[] = []
  for (const post of targetPosts) {
    const [comments, likes] = await Promise.all([
      getDocs(collection(db, 'discussionPosts', post.id, 'comments')),
      getDocs(collection(db, 'discussionPosts', post.id, 'likes')),
    ])
    ownPostCommentRefs.push(...comments.docs.map((d) => d.ref))
    ownPostLikeRefs.push(...likes.docs.map((d) => d.ref))
  }
  await deleteRefsInBatches(ownPostCommentRefs)
  await deleteRefsInBatches(ownPostLikeRefs)
  await deleteRefsInBatches(targetPosts.map((d) => d.ref))

  // This uid's own comments on OTHER people's (surviving) posts — the
  // isAdmin() bypass on discussionPosts/{id} allows setting commentCount to
  // any value in one write, not just ±1, so a multi-comment decrement is one
  // batch per post rather than one write per comment.
  let strayCommentCount = 0
  const survivingPosts = postsSnap.docs.filter((d) => !targetPostIds.has(d.id))
  for (const post of survivingPosts) {
    const commentsSnap = await getDocs(collection(db, 'discussionPosts', post.id, 'comments'))
    const strayComments = commentsSnap.docs.filter((c) => c.data().authorId === uid)
    if (strayComments.length === 0) continue
    const batch = writeBatch(db)
    for (const c of strayComments) batch.delete(c.ref)
    batch.update(doc(db, 'discussionPosts', post.id), {
      commentCount: increment(-strayComments.length),
    })
    await batch.commit()
    strayCommentCount += strayComments.length
  }

  await deleteDoc(doc(db, 'users', uid))

  return {
    vehicles: ownedVehicleIds.size,
    verifications: targetVerifications.length,
    listings: targetListings.length,
    posts: targetPosts.length,
    comments: ownPostCommentRefs.length + strayCommentCount,
  }
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
      score: data.score ?? 0,
      createdAt: toMillis(data.createdAt),
      updatedAt: toMillis(data.updatedAt),
      lastSeenAt: toMillis(data.lastSeenAt),
    }
  })
}

/**
 * 使用者交易紀錄 — schema-only for now (see transactions/{id}'s own comment
 * in firestore.rules): nothing writes one of these yet, since there's no
 * "標記已售出" flow in the app and the score +/- mechanic itself is still
 * being designed. Read-side exists now purely so UserDetailSection.vue has
 * somewhere real to display them from the moment both those pieces land,
 * without another round of plumbing.
 */
export interface AdminTransaction {
  id: string
  buyerId: string
  sellerId: string
  vehicleId: string | null
  listingId: string | null
  vehicleSnapshot: { brand: string; model: string } | null
  priceTwd: number | null
  completedAt: number
  createdAt: number
}

/** One users/{uid}/scoreEvents/{id} doc — the audit trail behind
 *  AdminUserProfile.score (see that field's own comment). Written only by
 *  score.service.ts's recordScoreEvent (Admin SDK); this is read-only. */
export interface AdminScoreEvent {
  id: string
  delta: number
  reason: 'disclosure_comparison' | 'appointment_kept' | string
  rulesVersion: string
  verificationId?: string
  relatedVerificationId?: string
  listingId?: string
  appointmentId?: string
  createdAt: number
}

export async function listScoreEvents(uid: string): Promise<AdminScoreEvent[]> {
  const snapshot = await getDocs(collection(db, 'users', uid, 'scoreEvents'))
  return snapshot.docs
    .map((d) => {
      const data = d.data()
      return {
        id: d.id,
        delta: data.delta ?? 0,
        reason: data.reason ?? '',
        rulesVersion: data.rulesVersion ?? '',
        verificationId: data.verificationId ?? undefined,
        relatedVerificationId: data.relatedVerificationId ?? undefined,
        listingId: data.listingId ?? undefined,
        appointmentId: data.appointmentId ?? undefined,
        createdAt: toMillis(data.createdAt),
      }
    })
    .sort((a, b) => b.createdAt - a.createdAt)
}

export async function listAllTransactions(): Promise<AdminTransaction[]> {
  const snapshot = await getDocs(collection(db, 'transactions'))
  return snapshot.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      buyerId: data.buyerId ?? '',
      sellerId: data.sellerId ?? '',
      vehicleId: data.vehicleId ?? null,
      listingId: data.listingId ?? null,
      vehicleSnapshot: data.vehicleSnapshot ?? null,
      priceTwd: data.priceTwd ?? null,
      completedAt: toMillis(data.completedAt),
      createdAt: toMillis(data.createdAt),
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

/** Excludes `draft` verifications — an untouched draft isn't inspection work
 * yet (no evidence, nothing for ops to review or report on), so it's noise
 * in every admin list/stat that consumes this. `in_progress` and later
 * statuses still show. */
export async function listAllVerifications(): Promise<Verification[]> {
  const snapshot = await getDocs(collection(db, 'verifications'))
  return snapshot.docs
    .map((d) => {
      const data = d.data()
      return {
        ...data,
        id: d.id,
        createdAt: toMillis(data.createdAt),
        completedAt: data.completedAt ? toMillis(data.completedAt) : undefined,
      } as Verification
    })
    .filter((v) => v.status !== 'draft')
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

/** Every evidence file (photo/video) for one verification, itemId included —
 * used by VerifyDetailSection.vue to let an admin actually watch/view the
 * raw capture, not just read the AI's verdict. `remoteUrl` here is still a
 * Storage object PATH (see storage.service.ts's uploadPrivateFile doc
 * comment) — the caller resolves it to a fresh download URL at render time,
 * same as the mobile report already does, never persisted or cached past
 * the current session. */
export async function listVerificationEvidence(
  verificationId: string,
): Promise<VerificationEvidence[]> {
  const snapshot = await getDocs(collection(db, 'verifications', verificationId, 'evidence'))
  return snapshot.docs.map((d) => {
    const data = d.data()
    return { ...data, createdAt: toMillis(data.createdAt) } as VerificationEvidence
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

/** Reverses hidePost() — only ever 'hidden' -> 'active', never touches a
 *  'deleted' post (no admin UI restores those; author-delete is intentional
 *  and distinct from admin moderation). Same isAdmin() bypass covers this,
 *  no new firestore.rules needed. */
export async function restorePost(postId: string): Promise<void> {
  await updateDoc(doc(db, 'discussionPosts', postId), { status: 'active' })
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

export interface SystemAnnouncement {
  id: string
  title: string
  body: string
  createdAt: number
}

/** Creating a doc here fans a `system` notification out to every user's
 *  users/{uid}/notifications feed — see functions/src/functions/
 *  notifications/on-system-announcement-created.ts. firestore.rules gates
 *  this collection to isAdmin(), same as vehicleNews. */
export async function sendSystemAnnouncement(title: string, body: string): Promise<void> {
  await addDoc(collection(db, 'systemAnnouncements'), { title, body, createdAt: serverTimestamp() })
}

export async function listSystemAnnouncements(): Promise<SystemAnnouncement[]> {
  const snapshot = await getDocs(collection(db, 'systemAnnouncements'))
  return snapshot.docs
    .map((d) => {
      const data = d.data()
      return {
        id: d.id,
        title: data.title ?? '',
        body: data.body ?? '',
        createdAt: toMillis(data.createdAt),
      }
    })
    .sort((a, b) => b.createdAt - a.createdAt)
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

/** Which Core Vision route (functions/src/services/core-vision-split
 * .service.ts) an issue applies to — 1:1 with which APR-* photo(s) that
 * route actually reads, so an issue only ever nudges the ONE Gemini call
 * that could actually see it. 'general' has no specific photo view to
 * check it against, so it's reference-only and never injected into any
 * Core Vision prompt (see resolveKnownIssuesForPart, functions/src/services
 * /vehicle-context.service.ts). */
export type VehicleModelKnownIssuePart =
  'sides' | 'rear' | 'front_suspension' | 'engine_bottom' | 'general'

export interface VehicleModelKnownIssue {
  id: string
  part: VehicleModelKnownIssuePart
  description: string
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
  /** 鏈條傳動 — feeds Vehicle.hasChain (see types/vehicle.ts) when a user
   * picks this model, which in turn drives whether BasicHealthCheck13.vue's
   * checklist includes the 鏈條 item. */
  hasChain: boolean
  /** Alternate/colloquial names for this model (e.g. 山葉100、老山葉). Reference
   * data only for now — nothing in the app reads it yet. */
  synonyms: string[]
  /** 車型專屬通病 — read server-side by resolveKnownIssuesForPart
   * (functions/src/services/vehicle-context.service.ts) once a verified
   * vehicle links here via Vehicle.modelId, then injected into that part's
   * Core Vision prompt as an explicit "reference only, not confirmed"
   * hint. */
  knownIssues: VehicleModelKnownIssue[]
  /** 二手價區間 (TWD) — shown as the last section of a verification report
   *  (useInspectionReportSections.ts) when set. null = admin hasn't set one. */
  usedPriceRangeTwd: { min: number; max: number } | null
  coverImageUrl: string | null
  photos: string[]
  /** Per-item marker placement for 基本13項健檢 (BasicHealthCheck13.vue),
   *  admin-edited via admin/sections/HealthCheckSection.vue. Keyed by item
   *  key (see src/data/verification/basic-health-check-items.ts). A missing
   *  key means "not yet placed" for that item — the runtime component falls
   *  back to a "尚未設定" state rather than guessing a position. `null` =
   *  this model has never been annotated at all. */
  healthCheckAnchors: Record<string, HealthCheckAnchor> | null
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
      hasChain: data.hasChain ?? false,
      synonyms: data.synonyms ?? [],
      knownIssues: data.knownIssues ?? [],
      usedPriceRangeTwd: data.usedPriceRangeTwd ?? null,
      coverImageUrl: data.coverImageUrl ?? null,
      photos: data.photos ?? [],
      healthCheckAnchors: data.healthCheckAnchors ?? null,
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
  hasChain: boolean
  synonyms: string[]
  knownIssues: VehicleModelKnownIssue[]
  usedPriceRangeTwd: { min: number; max: number } | null
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

export async function createVehicleModel(input: CreateVehicleModelInput): Promise<string> {
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
  const ref = await addDoc(collection(db, 'vehicleModels'), {
    brand: input.brand,
    series: input.series,
    modelYear: input.modelYear,
    trimName: input.trimName,
    bodyType: input.bodyType,
    powerType: input.powerType,
    displacementCc: input.displacementCc,
    transmission: input.transmission,
    hasChain: input.hasChain,
    synonyms: input.synonyms,
    knownIssues: input.knownIssues,
    usedPriceRangeTwd: input.usedPriceRangeTwd,
    coverImageUrl: null,
    photos: [],
    healthCheckAnchors: null,
    specs,
    features: EMPTY_FEATURES,
    realFuelStats: { averageKmPerL: null, vehicleCount: 0 },
    reviewStats: { averageRating: null, reviewCount: 0 },
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateVehicleModel(
  id: string,
  input: CreateVehicleModelInput,
): Promise<void> {
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
  await updateDoc(doc(db, 'vehicleModels', id), {
    brand: input.brand,
    series: input.series,
    modelYear: input.modelYear,
    trimName: input.trimName,
    bodyType: input.bodyType,
    powerType: input.powerType,
    displacementCc: input.displacementCc,
    transmission: input.transmission,
    hasChain: input.hasChain,
    synonyms: input.synonyms,
    knownIssues: input.knownIssues,
    usedPriceRangeTwd: input.usedPriceRangeTwd,
    specs,
  })
}

export async function setVehicleModelCoverImage(id: string, coverImageUrl: string): Promise<void> {
  await updateDoc(doc(db, 'vehicleModels', id), { coverImageUrl })
}

/** Overwrites the full per-item anchor map for one model's 基本13項健檢 —
 *  see HealthCheckAnnotationEditor.vue's save button. Always writes the
 *  complete map (not a per-key merge) since the editor holds a full draft
 *  copy already seeded from the existing data. */
export async function setVehicleModelHealthCheckAnchors(
  id: string,
  anchors: Record<string, HealthCheckAnchor>,
): Promise<void> {
  await updateDoc(doc(db, 'vehicleModels', id), { healthCheckAnchors: anchors })
}

export async function deleteVehicleModel(id: string): Promise<void> {
  await deleteDoc(doc(db, 'vehicleModels', id))
}

/**
 * AI Prompt 設定 — lets an admin view/edit the exact prompt text sent to
 * Gemini without a code deploy. Defaults live in Cloud Functions source
 * (functions/src/ai/prompts/registry.ts), so reading the catalog goes
 * through a callable (getAiPromptCatalog); an override is just a document
 * under aiPrompts/{key}, written directly like vehicleModels above — gated
 * by firestore.rules' isAdmin(), read by the Trusted Backend via Admin SDK
 * (see functions/src/services/prompt-config.service.ts).
 */
export interface AdminAiPrompt {
  key: string
  label: string
  defaultText: string
  overrideText: string | null
  updatedAt: number | null
  updatedBy: string | null
}

export async function listAiPrompts(): Promise<AdminAiPrompt[]> {
  const call = httpsCallable<Record<string, never>, { prompts: AdminAiPrompt[] }>(
    functions,
    'getAiPromptCatalog',
  )
  const response = await call({})
  return response.data.prompts
}

export async function setAiPromptOverride(key: string, text: string): Promise<void> {
  await setDoc(doc(db, 'aiPrompts', key), {
    text,
    updatedAt: Date.now(),
    updatedBy: auth.currentUser?.email ?? auth.currentUser?.uid ?? 'admin',
  })
}

export async function resetAiPromptOverride(key: string): Promise<void> {
  await deleteDoc(doc(db, 'aiPrompts', key))
}

/**
 * One-time maintenance action: corrects every conversations/{id}.
 * memberSnapshots displayName that's drifted from the member's actual
 * current users/{uid}.displayName (see functions/src/functions/
 * admin-sync-conversation-names.ts's doc comment for why this drifted in
 * the first place). Safe to run more than once — it's a no-op for anything
 * already correct.
 */
export async function syncConversationMemberNames(): Promise<{
  conversationsScanned: number
  conversationsUpdated: number
}> {
  const call = httpsCallable<
    Record<string, never>,
    { conversationsScanned: number; conversationsUpdated: number }
  >(functions, 'adminSyncConversationMemberNames')
  const response = await call({})
  return response.data
}
