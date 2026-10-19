import { collectionGroup, doc, getDoc, getDocs, query, where } from 'firebase/firestore'

import { db } from './firebase'
import { toAppointment, type AppointmentDoc } from './listing.service'
import type { VehicleSnapshot } from '@/data/home/marketplace-mock'
import type { ListingAppointment } from '@/types/listing-appointment'

/**
 * Cross-listing "my appointments as a buyer" lookups — kept separate from
 * listing.service.ts because every function there is scoped to one already-
 * known listingId; these use a Firestore `collectionGroup` query spanning
 * every `marketplaceListings/{id}/appointments` subcollection at once.
 *
 * Powers the buyer-verification redesign: VerificationView.vue's "與賣家
 * 預約看車時間在 30 分鐘內" card (listMyApprovedAppointmentsWithin) and its
 * buyer vehicle-picker dropdown (listMyBookableAppointments) — see
 * docs/witty-honking-parnas plan for the full design. Both replace the old
 * (wrong) behavior of showing the buyer their OWN vehicles to "verify".
 */
export interface MyAppointmentWithListing {
  appointment: ListingAppointment
  listingId: string
  vehicleId: string
  vehicleSnapshot: VehicleSnapshot
  sellerId: string
  /** marketplaceListings/{listingId}.verificationIds[0] — the seller's own
   *  completed verification for this vehicle, if any. Taken directly from
   *  the listing (not re-derived via a `verifications` query) because a
   *  buyer can't `list` another user's verifications under firestore.rules;
   *  this field is already embedded in a doc the buyer CAN read. */
  sellerVerificationId: string | null
}

interface ListingDocShape {
  vehicleId?: string
  vehicleSnapshot?: VehicleSnapshot
  sellerId?: string
  verificationIds?: string[]
}

/** Shared by both queries below — resolves each distinct listingId behind a
 *  batch of appointment docs, in parallel, and zips them back together.
 *  Appointments whose parent listing no longer exists (deleted) are
 *  silently dropped rather than thrown. */
async function withListingContext(
  appointmentDocs: { id: string; data: AppointmentDoc; listingId: string }[],
): Promise<MyAppointmentWithListing[]> {
  const uniqueListingIds = [...new Set(appointmentDocs.map((d) => d.listingId))]
  // A buyer can only `get` a listing that's still published (firestore.rules)
  // — one that was since sold/unpublished throws permission-denied, which
  // used to reject this whole Promise.all and drop EVERY appointment. Treat
  // an unreadable listing the same as a deleted one.
  const listingSnaps = await Promise.all(
    uniqueListingIds.map((id) => getDoc(doc(db, 'marketplaceListings', id)).catch(() => null)),
  )
  const listingById = new Map(
    listingSnaps
      .filter((snap) => snap?.exists())
      .map((snap) => [snap!.id, snap!.data() as ListingDocShape]),
  )

  const result: MyAppointmentWithListing[] = []
  for (const entry of appointmentDocs) {
    const listing = listingById.get(entry.listingId)
    if (!listing?.vehicleId || !listing.vehicleSnapshot || !listing.sellerId) continue
    result.push({
      appointment: toAppointment(entry.id, entry.data),
      listingId: entry.listingId,
      vehicleId: listing.vehicleId,
      vehicleSnapshot: listing.vehicleSnapshot,
      sellerId: listing.sellerId,
      sellerVerificationId: listing.verificationIds?.[0] ?? null,
    })
  }
  return result
}

/** VerificationView.vue's blue-bordered "與賣家預約看車時間！" card — an
 *  approved appointment whose scheduledAt falls within the next `windowMs`.
 *  The time-window filter runs client-side (not a 3rd composite-index
 *  field) since this is always a handful of docs per buyer at most, same
 *  "small-N client-side filter" convention VerificationView.vue's own
 *  recent-verifications list already uses. */
async function listMyApprovedAppointmentsWithin(
  buyerId: string,
  windowMs: number,
  /** Keep showing it this long AFTER the scheduled time too — the buyer is
   *  usually still on-site inspecting right after the agreed time. */
  graceAfterMs = 0,
): Promise<MyAppointmentWithListing[]> {
  const snapshot = await getDocs(
    query(
      collectionGroup(db, 'appointments'),
      where('buyerId', '==', buyerId),
      where('status', '==', 'approved'),
    ),
  )
  const now = Date.now()
  const docs = snapshot.docs
    .map((docSnapshot) => ({
      id: docSnapshot.id,
      data: docSnapshot.data() as AppointmentDoc,
      listingId: docSnapshot.ref.parent.parent!.id,
    }))
    .filter((entry) => {
      const scheduledAt = entry.data.scheduledAt?.toMillis?.() ?? 0
      return scheduledAt >= now - graceAfterMs && scheduledAt <= now + windowMs
    })
  return withListingContext(docs)
}

/** VerificationView.vue's buyer vehicle-picker dropdown — every vehicle the
 *  buyer has a live (not yet declined/cancelled/completed) appointment for,
 *  pending included so a buyer can start re-verifying ahead of the seller's
 *  approval (createVerificationRecord already tolerates a missing
 *  relatedVerificationId until the seller verification exists).
 *
 *  Past appointments are left out (only ones still ahead, or that started
 *  less than `graceAfterMs` ago — the buyer may still be on site), and each
 *  listing appears once, at its nearest such appointment — otherwise every
 *  old booking of the same car piled up in the dropdown. */
async function listMyBookableAppointments(
  buyerId: string,
  graceAfterMs = 2 * 60 * 60 * 1000,
): Promise<MyAppointmentWithListing[]> {
  const snapshot = await getDocs(
    query(
      collectionGroup(db, 'appointments'),
      where('buyerId', '==', buyerId),
      where('status', 'in', ['pending', 'approved']),
    ),
  )
  const cutoff = Date.now() - graceAfterMs
  const nearestByListing = new Map<
    string,
    { id: string; data: AppointmentDoc; listingId: string; at: number }
  >()
  for (const docSnapshot of snapshot.docs) {
    const data = docSnapshot.data() as AppointmentDoc
    const at = data.scheduledAt?.toMillis?.() ?? 0
    if (at < cutoff) continue
    const listingId = docSnapshot.ref.parent.parent!.id
    const current = nearestByListing.get(listingId)
    if (!current || at < current.at) {
      nearestByListing.set(listingId, { id: docSnapshot.id, data, listingId, at })
    }
  }
  const docs = [...nearestByListing.values()].sort((a, b) => a.at - b.at)
  return withListingContext(docs)
}

export const listingAppointmentLookupService = {
  listMyApprovedAppointmentsWithin,
  listMyBookableAppointments,
}
