import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'

import type { MockMarketListing, VehicleSnapshot } from '@/data/home/marketplace-mock'
import type { ListingAppointment, ListingAppointmentDraft } from '@/types/listing-appointment'

import { db } from './firebase'

const COLLECTION = 'marketplaceListings'

/** Everything `create()` needs to both write the listing doc and build its
 * vehicleSnapshot — a flat shape since that's what the listing form
 * collects, reshaped into the nested doc internally. */
export interface ListingDraft {
  vehicleId: string
  /** Vehicle.modelId (types/vehicle.ts), if the backing vehicle is linked to
   * a 車輛選單資訊 catalog entry — see VehicleSnapshot.modelId. */
  modelId?: string | null
  verificationId: string
  brand: string
  model: string
  year: number
  mileageKm: number
  priceTwd: number
  region: string
  district: string
  displacementCc: number
  transmission: string
  color: string
  modified: boolean
  /** From the backing vehicleModels/{modelId} doc, if linked — see
   * VehicleSnapshot.bodyType/powerType (marketplace-mock.ts). null when the
   * vehicle has no modelId link. */
  bodyType: string | null
  powerType: 'gasoline' | 'electric' | null
  description: string
  photos: string[]
  sellerId: string
  sellerName: string
  sellerType: 'individual' | 'dealer'
  sellerRating: number
  sellerReviewCount: number
  verificationScore: number
}

/** Firestore rejects `undefined` field values — strip them before writing. */
function stripUndefined<T extends object>(value: T): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(value)) {
    if (val !== undefined) result[key] = val
  }
  return result
}

function toMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis()
  if (typeof value === 'number') return value
  return 0
}

/** Firestore Timestamps on `createdAt`/`publishedAt` need converting —
 * everything else on a listing doc is already app-shaped. */
function toListing(id: string, data: Record<string, unknown>): MockMarketListing {
  return {
    ...(data as unknown as MockMarketListing),
    id,
    createdAt: toMillis(data.createdAt),
    publishedAt: data.publishedAt ? toMillis(data.publishedAt) : null,
  }
}

async function listBySeller(sellerId: string): Promise<MockMarketListing[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), where('sellerId', '==', sellerId)),
  )
  return (
    snapshot.docs
      .map((docSnapshot) => toListing(docSnapshot.id, docSnapshot.data()))
      // The seeded DEMO listings (marketplace-mock.ts) also carry a `sellerId`
      // pointing at a real test account — but only so their "聊聊" button opens
      // a real conversation, not because that account actually published them.
      // A genuine self-published listing always has `vehicleId`; the fictional
      // DEMO ones never do, so this is the correct discriminator for
      // "我的刊登", not `sellerId` alone.
      .filter((listing) => !!listing.vehicleId)
      .sort((a, b) => b.id.localeCompare(a.id))
  )
}

/**
 * Firestore generates the doc ID client-side before any write happens, so
 * callers that need the future listing's ID up front — to build its
 * `marketplace/{listingId}/...` Storage path before the doc itself exists —
 * can reserve it here without an extra round trip. Same pattern as
 * chat.service.ts's reserveMessageId().
 */
function reserveListingId(): string {
  return doc(collection(db, COLLECTION)).id
}

/** Stage 1 of publishing: writes a `status:'draft'` listing with its
 * vehicleSnapshot built from the form fields, at the given (pre-reserved —
 * see reserveListingId()) id. Call `publish()` right after to make it live —
 * see MyListingsView.vue, which does both in one click. */
async function create(id: string, draft: ListingDraft): Promise<void> {
  const vehicleSnapshot: VehicleSnapshot = {
    brand: draft.brand,
    model: draft.model,
    manufactureYear: draft.year,
    mileage: draft.mileageKm,
    displacementCc: draft.displacementCc,
    transmission: draft.transmission,
    color: draft.color,
    modified: draft.modified,
    bodyType: draft.bodyType ?? null,
    powerType: draft.powerType ?? null,
    photos: draft.photos,
    modelId: draft.modelId ?? null,
  }
  await setDoc(doc(db, COLLECTION, id), {
    status: 'draft',
    vehicleId: draft.vehicleId,
    verificationIds: [draft.verificationId],
    priceTwd: draft.priceTwd,
    region: draft.region,
    district: draft.district,
    ...stripUndefined({ description: draft.description || undefined }),
    vehicleSnapshot,
    sellerId: draft.sellerId,
    sellerName: draft.sellerName,
    sellerType: draft.sellerType,
    sellerRating: draft.sellerRating,
    sellerReviewCount: draft.sellerReviewCount,
    verificationScore: draft.verificationScore,
    favoriteCount: 0,
    appointmentCount: 0,
    createdAt: serverTimestamp(),
    publishedAt: null,
  })
}

/**
 * Stage 2 of publishing: flips the listing live and, in the same batch,
 * flips `isPublic:true` on every verification it carries (spec §12/§24) —
 * one-way, enforced by firestore.rules' verifications update rule (only
 * legal while isPublic is still false). No Cloud Functions in this app
 * (client-SDK-only throughout), so this batch — not a server function — is
 * what actually makes the invariant "published implies public report" hold;
 * the rules are what make it *safe* to do from the client.
 *
 * 2026-10: skips any verificationId that's ALREADY public (a re-list of the
 * same vehicle after an earlier listing published the same seller
 * verification — e.g. the previous listing was deleted/delisted and the
 * seller created a new one) — a Firestore batch is all-or-nothing, so
 * including even one already-public verification's now-redundant `isPublic:
 * true` write got the WHOLE batch rejected by that rule's "only while still
 * false" guard, which silently left the listing itself stuck at 'draft'
 * forever (a real incident caught this way — see MyListingManageView.vue's
 * lack of any "stuck draft" recovery path, which is why this is fixed here
 * rather than relying on a retry UI).
 */
async function publish(listingId: string, verificationIds: string[]): Promise<void> {
  const batch = writeBatch(db)
  batch.update(doc(db, COLLECTION, listingId), {
    status: 'published',
    publishedAt: serverTimestamp(),
  })
  for (const verificationId of verificationIds) {
    const verificationRef = doc(db, 'verifications', verificationId)
    const verificationSnap = await getDoc(verificationRef)
    if (verificationSnap.data()?.isPublic === true) continue
    batch.update(verificationRef, { isPublic: true })
  }
  await batch.commit()
}

/**
 * Seller-driven take-down — `published` only (firestore.rules' matching
 * clause doesn't allow this from 'draft' or 'sold'), pulled out of
 * marketplace browse for free the same way `publish()`'s own status write
 * put it there: homeContentService.listMarketplaceListings() only ever
 * queries status=='published'.
 *
 * Deliberately does NOT touch the linked verification(s)' `isPublic` —
 * once true it's a one-way, immutable guarantee enforced in firestore.rules
 * (see that rule's own comment: "no further edits... even for admin"), not
 * something a delist should try to revert. A delisted listing's report stays
 * reachable by anyone who already has the /share/:id link; only the listing
 * itself leaves the marketplace.
 */
async function delist(listingId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, listingId), { status: 'delisted' })
}

/** Reverses delist() — back to 'published', no re-stamped publishedAt (that
 *  field means "first went live", not "most recently went live"). */
async function relist(listingId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, listingId), { status: 'published' })
}

export interface ListingUpdate {
  priceTwd?: number
  description?: string
  region?: string
  district?: string
  availableDates?: string[]
  timeSlots?: string[]
  /** Per-date custom viewing times — see MockMarketListing.availableSlots. */
  availableSlots?: Record<string, string[]>
}

async function update(id: string, changes: ListingUpdate): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...stripUndefined(changes),
    updatedAt: serverTimestamp(),
  })
}

/** vehicleSnapshot.photos specifically — separate from update() since it's
 * the one field that lives inside the nested snapshot map. */
async function updatePhotos(id: string, photos: string[]): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    'vehicleSnapshot.photos': photos,
    updatedAt: serverTimestamp(),
  })
}

// --- Viewing appointments: marketplaceListings/{id}/appointments/{id} —
// see firestore.rules for the buyer/seller transition rules. ---

/** Exported so listing-appointment-lookup.service.ts's collectionGroup
 *  query (spans every listing's appointments subcollection at once, so it
 *  can't go through any of this file's own per-listing functions) can map
 *  raw docs the same way. */
export interface AppointmentDoc extends Omit<
  ListingAppointment,
  'id' | 'createdAt' | 'scheduledAt' | 'status'
> {
  scheduledAt: Timestamp
  createdAt: Timestamp
  status?: ListingAppointment['status']
}

export function toAppointment(id: string, data: AppointmentDoc): ListingAppointment {
  return {
    id,
    listingId: data.listingId,
    buyerId: data.buyerId,
    buyerName: data.buyerName,
    scheduledAt: data.scheduledAt?.toMillis() ?? Date.now(),
    note: data.note,
    // Appointments created before the approve/decline flow existed have no
    // `status` field — treat those as already-pending rather than crashing.
    status: data.status ?? 'pending',
    createdAt: data.createdAt?.toMillis() ?? Date.now(),
    buyerDealReport: data.buyerDealReport,
    sellerDealReport: data.sellerDealReport,
    transferInviteCode: data.transferInviteCode,
  }
}

async function listAppointments(listingId: string): Promise<ListingAppointment[]> {
  const snapshot = await getDocs(collection(db, COLLECTION, listingId, 'appointments'))
  return snapshot.docs
    .map((docSnapshot) => toAppointment(docSnapshot.id, docSnapshot.data() as AppointmentDoc))
    .sort((a, b) => a.scheduledAt - b.scheduledAt)
}

async function createAppointment(draft: ListingAppointmentDraft): Promise<string> {
  const batch = writeBatch(db)
  const appointmentRef = doc(collection(db, COLLECTION, draft.listingId, 'appointments'))
  batch.set(appointmentRef, {
    ...stripUndefined(draft),
    scheduledAt: Timestamp.fromMillis(draft.scheduledAt),
    status: 'pending',
    createdAt: serverTimestamp(),
  })
  batch.update(doc(db, COLLECTION, draft.listingId), { appointmentCount: increment(1) })
  await batch.commit()
  return appointmentRef.id
}

async function updateAppointmentStatus(
  listingId: string,
  appointmentId: string,
  status: ListingAppointment['status'],
): Promise<void> {
  const batch = writeBatch(db)
  batch.update(doc(db, COLLECTION, listingId, 'appointments', appointmentId), { status })
  // 'declined' (seller), 'cancelled' (buyer, Task C1 — firestore.rules
  // already allowed this transition, but no client code ever produced it
  // until now), and 'completed' (seller's 標記已完成看車, see
  // listing-appointment.ts) all leave the pending+approved set spec §13's
  // appointmentCount tracks; 'approved' stays counted, so no change there.
  if (status === 'declined' || status === 'cancelled' || status === 'completed') {
    batch.update(doc(db, COLLECTION, listingId), { appointmentCount: increment(-1) })
  }
  await batch.commit()
}

/** "有成交嗎？" — each side's own one-time answer (ChatRoomView.vue, once
 *  `scheduledAt` has passed on an 'approved' appointment). Writes only the
 *  caller's own field (firestore.rules enforces buyer vs seller can only
 *  ever touch their own); once both sides report dealConfirmed:true,
 *  onAppointmentDealConfirmed.ts auto-generates a 轉移碼 and posts it into
 *  this conversation. */
async function submitDealReport(
  listingId: string,
  appointmentId: string,
  side: 'buyer' | 'seller',
  report: { dealConfirmed: boolean; priceTwd: number | null },
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, listingId, 'appointments', appointmentId), {
    [`${side}DealReport`]: { ...report, respondedAt: Date.now() },
  })
}

/** Live appointments subscription — replaces the one-time listAppointments()
 * fetch on the buyer detail page / seller management page / chat room's
 * appointment banner (Task C2), so an approve/decline/cancel on one side
 * shows up on the other without a manual reload. Same onSnapshot(collection)
 * pattern as discussion.service.ts's post/comment subscriptions. */
function subscribeAppointments(
  listingId: string,
  onChange: (appointments: ListingAppointment[]) => void,
): Unsubscribe {
  return onSnapshot(collection(db, COLLECTION, listingId, 'appointments'), (snapshot) => {
    const appointments = snapshot.docs
      .map((docSnapshot) => toAppointment(docSnapshot.id, docSnapshot.data() as AppointmentDoc))
      .sort((a, b) => a.scheduledAt - b.scheduledAt)
    onChange(appointments)
  })
}

/** ChatRoomView.vue's variant — that page only ever cares about ONE buyer's
 * appointments (the other participant in this specific 1:1 conversation),
 * whether the current viewer IS that buyer or is the seller looking at
 * them. Unlike subscribeAppointments() above (an unfiltered scan of every
 * buyer's appointments, fine for the seller-only MyListingManageView.vue),
 * a buyer's own read here MUST be constrained by `where('buyerId', ...)` —
 * firestore.rules' appointments read rule allows a doc via
 * `resource.data.buyerId == myUid()`, and Firestore only honors a
 * per-document rule condition for a *list* query when the query itself is
 * narrowed to match it; an unfiltered collection listener silently gets
 * denied for a buyer (their subscription just never fires), which is
 * exactly why the appointment banner used to only ever show up for the
 * seller side of the chat. */
function subscribeAppointmentsForBuyer(
  listingId: string,
  buyerId: string,
  onChange: (appointments: ListingAppointment[]) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(db, COLLECTION, listingId, 'appointments'), where('buyerId', '==', buyerId)),
    (snapshot) => {
      const appointments = snapshot.docs
        .map((docSnapshot) => toAppointment(docSnapshot.id, docSnapshot.data() as AppointmentDoc))
        .sort((a, b) => a.scheduledAt - b.scheduledAt)
      onChange(appointments)
    },
  )
}

async function get(id: string): Promise<MockMarketListing | null> {
  const snapshot = await getDoc(doc(db, COLLECTION, id))
  if (!snapshot.exists()) return null
  return toListing(snapshot.id, snapshot.data())
}

/** Live single-listing subscription — used by the detail page so its
 * favoriteCount (and anything else about the listing) updates in real time
 * without a reload, same onSnapshot(doc) pattern as discussion.service.ts's
 * subscribePost. */
function subscribeListing(
  id: string,
  onChange: (listing: MockMarketListing | null) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, COLLECTION, id),
    (snapshot) => {
      onChange(snapshot.exists() ? toListing(snapshot.id, snapshot.data()) : null)
    },
    // Without this, a denied read (status isn't 'published' and the viewer
    // isn't the seller/admin — e.g. someone with an old link to a listing
    // the seller has since delisted, or a draft) never calls `onChange` at
    // all: no error handler here previously meant the caller's own
    // `loading` state just stayed stuck forever instead of resolving to its
    // existing "找不到這台車輛" empty state. Treated the same as "doesn't
    // exist" — the viewer has no way to distinguish those cases anyway, and
    // shouldn't (shows nothing more than a stranger gets for a genuinely
    // missing id).
    () => onChange(null),
  )
}

// --- Favorites: users/{uid}/favoriteListings/{listingId} — mirrors the
// savedPosts bookmark pattern in discussion.service.ts. The favorite doc
// itself stays a private wishlist entry (only its owner can read/write it),
// but each add/remove also transactionally maintains a public
// marketplaceListings/{id}.favoriteCount, the same likeCount-on-post pattern
// discussion.service.ts's toggleLike uses — so "how many people favorited
// this" can be shown/subscribed to without ever reading another user's
// private favoriteListings subcollection.

async function addFavorite(uid: string, listingId: string): Promise<void> {
  const favoriteRef = doc(db, 'users', uid, 'favoriteListings', listingId)
  const listingRef = doc(db, COLLECTION, listingId)
  await runTransaction(db, async (tx) => {
    const favoriteSnap = await tx.get(favoriteRef)
    if (favoriteSnap.exists()) return
    tx.set(favoriteRef, { listingId, createdAt: serverTimestamp() })
    tx.update(listingRef, { favoriteCount: increment(1) })
  })
}

async function removeFavorite(uid: string, listingId: string): Promise<void> {
  const favoriteRef = doc(db, 'users', uid, 'favoriteListings', listingId)
  const listingRef = doc(db, COLLECTION, listingId)
  await runTransaction(db, async (tx) => {
    const favoriteSnap = await tx.get(favoriteRef)
    if (!favoriteSnap.exists()) return
    tx.delete(favoriteRef)
    tx.update(listingRef, { favoriteCount: increment(-1) })
  })
}

async function listFavoriteIds(uid: string): Promise<string[]> {
  const snapshot = await getDocs(collection(db, 'users', uid, 'favoriteListings'))
  return snapshot.docs.map((docSnapshot) => docSnapshot.id)
}

export const listingService = {
  listBySeller,
  reserveListingId,
  create,
  publish,
  delist,
  relist,
  update,
  updatePhotos,
  get,
  subscribeListing,
  listAppointments,
  subscribeAppointments,
  subscribeAppointmentsForBuyer,
  createAppointment,
  updateAppointmentStatus,
  submitDealReport,
  addFavorite,
  removeFavorite,
  listFavoriteIds,
}
