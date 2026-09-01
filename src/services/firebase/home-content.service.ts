import { collection, doc, getDoc, getDocs } from 'firebase/firestore'

import type { MockFeaturedDealer } from '@/data/home/featured-dealers-mock'
import type { MockMarketListing } from '@/data/home/marketplace-mock'
import type { MockVehicleNews } from '@/data/home/vehicle-news-mock'

import { db } from './firebase'

/**
 * Read-only access to the Home/Marketplace DEMO content — seeded via
 * scripts/seed-marketplace-mock.mjs into its own Firestore collections
 * (marketplaceListings / featuredDealers / vehicleNews) rather than living
 * only as static arrays, so it can be updated (e.g. new mock photos) without
 * a rebuild. Every doc is written with an explicit id (demo-1, dealer-1, ...)
 * matching the original mock ids, so existing routes like /marketplace/demo-1
 * keep working unchanged.
 *
 * "我的刊登" is NOT here — it's real user data (create/update/list-by-seller)
 * served by listing.service.ts instead of this read-only DEMO-content module.
 */

function byId<T extends { id: string }>(a: T, b: T): number {
  return a.id.localeCompare(b.id)
}

async function listMarketplaceListings(): Promise<MockMarketListing[]> {
  const snapshot = await getDocs(collection(db, 'marketplaceListings'))
  return snapshot.docs
    .map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }) as MockMarketListing)
    .sort(byId)
}

async function getMarketplaceListing(id: string): Promise<MockMarketListing | null> {
  const snapshot = await getDoc(doc(db, 'marketplaceListings', id))
  if (!snapshot.exists()) return null
  return { id: snapshot.id, ...snapshot.data() } as MockMarketListing
}

async function listFeaturedDealers(): Promise<MockFeaturedDealer[]> {
  const snapshot = await getDocs(collection(db, 'featuredDealers'))
  return snapshot.docs
    .map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }) as MockFeaturedDealer)
    .sort(byId)
}

async function listVehicleNews(): Promise<MockVehicleNews[]> {
  const snapshot = await getDocs(collection(db, 'vehicleNews'))
  return snapshot.docs
    .map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }) as MockVehicleNews)
    .sort(byId)
}

export const homeContentService = {
  listMarketplaceListings,
  getMarketplaceListing,
  listFeaturedDealers,
  listVehicleNews,
}
