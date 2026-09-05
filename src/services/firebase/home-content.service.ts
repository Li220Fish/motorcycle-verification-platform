import { collection, doc, getDoc, getDocs, query, Timestamp, where } from 'firebase/firestore'

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

/** `createdAt`/`publishedAt` are Firestore Timestamps on the wire. */
function toListing(id: string, data: Record<string, unknown>): MockMarketListing {
  return {
    ...(data as unknown as MockMarketListing),
    id,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : undefined,
    publishedAt: data.publishedAt instanceof Timestamp ? data.publishedAt.toMillis() : null,
  }
}

/** Only `published` listings — required, not just correct, once
 * firestore.rules tightens marketplaceListings: an unfiltered scan across
 * mixed draft/published docs is rejected outright for a non-owner, non-admin
 * caller (a `list` query needs to be provably safe under the rule, which a
 * completely unconstrained scan can't be once the rule depends on `status`). */
async function listMarketplaceListings(): Promise<MockMarketListing[]> {
  const snapshot = await getDocs(
    query(collection(db, 'marketplaceListings'), where('status', '==', 'published')),
  )
  return snapshot.docs
    .map((docSnapshot) => toListing(docSnapshot.id, docSnapshot.data()))
    .sort(byId)
}

async function getMarketplaceListing(id: string): Promise<MockMarketListing | null> {
  const snapshot = await getDoc(doc(db, 'marketplaceListings', id))
  if (!snapshot.exists()) return null
  return toListing(snapshot.id, snapshot.data())
}

async function listFeaturedDealers(): Promise<MockFeaturedDealer[]> {
  const snapshot = await getDocs(collection(db, 'featuredDealers'))
  return snapshot.docs
    .map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }) as MockFeaturedDealer)
    .sort(byId)
}

/** `publishedAt` is a Firestore Timestamp on the wire — convert to millis
 * rather than spreading raw doc data, or the app receives a Timestamp object
 * where MockVehicleNews declares a number. */
function toVehicleNews(id: string, data: Record<string, unknown>): MockVehicleNews {
  const publishedAt = data.publishedAt
  return {
    id,
    title: data.title as string,
    summary: data.summary as string | undefined,
    category: data.category as string,
    coverImageUrl: (data.coverImageUrl as string | null | undefined) ?? null,
    sourceName: data.sourceName as string,
    sourceUrl: (data.sourceUrl as string | null | undefined) ?? null,
    content: data.content as string,
    publishedAt: publishedAt instanceof Timestamp ? publishedAt.toMillis() : Date.now(),
  }
}

async function listVehicleNews(): Promise<MockVehicleNews[]> {
  const snapshot = await getDocs(collection(db, 'vehicleNews'))
  return snapshot.docs
    .map((docSnapshot) => toVehicleNews(docSnapshot.id, docSnapshot.data()))
    .sort(byId)
}

async function getVehicleNews(id: string): Promise<MockVehicleNews | null> {
  const snapshot = await getDoc(doc(db, 'vehicleNews', id))
  if (!snapshot.exists()) return null
  return toVehicleNews(snapshot.id, snapshot.data())
}

export const homeContentService = {
  listMarketplaceListings,
  getMarketplaceListing,
  listFeaturedDealers,
  listVehicleNews,
  getVehicleNews,
}
