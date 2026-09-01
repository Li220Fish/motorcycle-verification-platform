import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'

import type { MockMarketListing } from '@/data/home/marketplace-mock'
import type { ListingAppointment, ListingAppointmentDraft } from '@/types/listing-appointment'

import { db } from './firebase'

const COLLECTION = 'marketplaceListings'

export interface ListingDraft {
  brand: string
  model: string
  year: number
  mileageKm: number
  vehicleId: string
  priceTwd: number
  region: string
  district: string
  transferable: boolean
  displacementCc: number
  transmission: string
  color: string
  modified: boolean
  description: string
  imageUrl?: string
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

async function listBySeller(sellerId: string): Promise<MockMarketListing[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), where('sellerId', '==', sellerId)),
  )
  return (
    snapshot.docs
      .map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }) as MockMarketListing)
      // The seeded DEMO listings (marketplace-mock.ts) also carry a `sellerId`
      // pointing at a real test account — but only so their "聊聊" button opens
      // a real conversation, not because that account actually published them.
      // A genuine self-published listing always has `vehicleId` (see create()
      // below); the fictional DEMO ones never do, so this is the correct
      // discriminator for "我的刊登", not `sellerId` alone.
      .filter((listing) => !!listing.vehicleId)
      .sort((a, b) => b.id.localeCompare(a.id))
  )
}

async function create(draft: ListingDraft): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...stripUndefined(draft),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export interface ListingUpdate {
  priceTwd?: number
  description?: string
  region?: string
  district?: string
  displacementCc?: number
  transmission?: string
  color?: string
  transferable?: boolean
  modified?: boolean
  imageUrl?: string
  photos?: string[]
  availableDates?: string[]
  timeSlots?: string[]
}

async function update(id: string, changes: ListingUpdate): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...stripUndefined(changes),
    updatedAt: serverTimestamp(),
  })
}

// --- Viewing appointments: marketplaceListings/{id}/appointments/{id} ---
// Covered by the existing `marketplaceListings/{document=**}` Firestore rule
// (recursive wildcard already grants any signed-in user read/write on every
// subcollection beneath a listing) — no separate rule needed.

interface AppointmentDoc extends Omit<ListingAppointment, 'id' | 'createdAt' | 'scheduledAt'> {
  scheduledAt: Timestamp
  createdAt: Timestamp
}

function toAppointment(id: string, data: AppointmentDoc): ListingAppointment {
  return {
    id,
    listingId: data.listingId,
    buyerId: data.buyerId,
    buyerName: data.buyerName,
    scheduledAt: data.scheduledAt?.toMillis() ?? Date.now(),
    note: data.note,
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
  const docRef = await addDoc(collection(db, COLLECTION, draft.listingId, 'appointments'), {
    ...stripUndefined(draft),
    scheduledAt: Timestamp.fromMillis(draft.scheduledAt),
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

async function get(id: string): Promise<MockMarketListing | null> {
  const snapshot = await getDoc(doc(db, COLLECTION, id))
  if (!snapshot.exists()) return null
  return { id: snapshot.id, ...snapshot.data() } as MockMarketListing
}

// --- Favorites: users/{uid}/favoriteListings/{listingId} — mirrors the
// savedPosts bookmark pattern in discussion.service.ts. A private wishlist,
// not a listing-side counter, so only the owner can read/write their own.

async function addFavorite(uid: string, listingId: string): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'favoriteListings', listingId), {
    listingId,
    favoritedAt: serverTimestamp(),
  })
}

async function removeFavorite(uid: string, listingId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'favoriteListings', listingId))
}

async function listFavoriteIds(uid: string): Promise<string[]> {
  const snapshot = await getDocs(collection(db, 'users', uid, 'favoriteListings'))
  return snapshot.docs.map((docSnapshot) => docSnapshot.id)
}

export const listingService = {
  listBySeller,
  create,
  update,
  get,
  listAppointments,
  createAppointment,
  addFavorite,
  removeFavorite,
  listFavoriteIds,
}
