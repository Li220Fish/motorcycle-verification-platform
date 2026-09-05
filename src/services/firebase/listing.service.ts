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
  verificationId: string
  brand: string
  model: string
  year: number
  mileageKm: number
  priceTwd: number
  region: string
  district: string
  transferable: boolean
  displacementCc: number
  transmission: string
  color: string
  modified: boolean
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
    photos: draft.photos,
  }
  await setDoc(doc(db, COLLECTION, id), {
    status: 'draft',
    vehicleId: draft.vehicleId,
    verificationIds: [draft.verificationId],
    priceTwd: draft.priceTwd,
    region: draft.region,
    district: draft.district,
    transferable: draft.transferable,
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
 */
async function publish(listingId: string, verificationIds: string[]): Promise<void> {
  const batch = writeBatch(db)
  batch.update(doc(db, COLLECTION, listingId), {
    status: 'published',
    publishedAt: serverTimestamp(),
  })
  for (const verificationId of verificationIds) {
    batch.update(doc(db, 'verifications', verificationId), { isPublic: true })
  }
  await batch.commit()
}

export interface ListingUpdate {
  priceTwd?: number
  description?: string
  region?: string
  district?: string
  transferable?: boolean
  availableDates?: string[]
  timeSlots?: string[]
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

interface AppointmentDoc extends Omit<
  ListingAppointment,
  'id' | 'createdAt' | 'scheduledAt' | 'status'
> {
  scheduledAt: Timestamp
  createdAt: Timestamp
  status?: ListingAppointment['status']
}

function toAppointment(id: string, data: AppointmentDoc): ListingAppointment {
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
  // Both call sites (ChatRoomView.vue) only ever transition an appointment
  // that's currently 'pending' — 'declined' is the only path that leaves the
  // pending+approved set spec §13's appointmentCount tracks; 'approved'
  // stays counted, so no change there.
  if (status === 'declined') {
    batch.update(doc(db, COLLECTION, listingId), { appointmentCount: increment(-1) })
  }
  await batch.commit()
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
  return onSnapshot(doc(db, COLLECTION, id), (snapshot) => {
    onChange(snapshot.exists() ? toListing(snapshot.id, snapshot.data()) : null)
  })
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
  update,
  updatePhotos,
  get,
  subscribeListing,
  listAppointments,
  createAppointment,
  updateAppointmentStatus,
  addFavorite,
  removeFavorite,
  listFavoriteIds,
}
