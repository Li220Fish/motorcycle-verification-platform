import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { assertOwnsVehicle } from '../services/auth.service'
import { notifyUser } from '../services/notification-dispatch.service'

interface RequestBody {
  vehicleId?: string
  buyerVerificationId?: string
}

interface VerificationDoc {
  type?: 'seller' | 'buyer' | 'professional'
  status?: string
  userId?: string
  vehicleId?: string
  relatedVerificationId?: string
  transactionDecision?: string
}

interface ListingDoc {
  sellerId?: string
  vehicleId?: string
  status?: string
  priceTwd?: number
  vehicleSnapshot?: { brand: string; model: string }
}

/**
 * 車輛過戶 — the one place `vehicles/{id}.currentOwnerId` can ever actually
 * change (firestore.rules' owner-edit rule requires it stay fixed on every
 * CLIENT write; this Function uses the Admin SDK, which bypasses that rule
 * entirely, same pattern as every other Trusted-Backend-only mutation in
 * this codebase — see score.service.ts for the closest sibling).
 *
 * Deliberately requires BOTH sides to have already acted before the seller
 * can even attempt this, so no single party can transfer a vehicle
 * unilaterally:
 *   1. The BUYER must have a 'completed' 買家複驗 for this exact vehicle,
 *      linked back to one of THIS caller's own seller verifications
 *      (relatedVerificationId), with transactionDecision === 'purchased'
 *      (VerificationComparisonView.vue's "已完成購買" — see
 *      types/verification.ts's own comment on why that alone isn't enough).
 *   2. The SELLER (this call's caller) must currently own the vehicle
 *      (assertOwnsVehicle) and be the one invoking this transfer — a buyer
 *      marking 'purchased' never moves ownership by itself.
 *
 * Once ownership flips, every vehicle-scoped collection that already keys
 * off `vehicleId` (fuelLogs, maintenanceLogs, verifications, evidence) is
 * immediately visible to the new owner for free — firestore.rules' various
 * `ownsVehicle(vehicleId)` checks re-resolve live against the vehicle doc,
 * nothing needs to be copied or re-pointed. That is the actual "履歷隨車
 * 移轉" mechanism; this Function only ever moves the one pointer.
 */
export const transferVehicleOwnership = onCall({}, async (request) => {
  const data = request.data as RequestBody
  if (!data.vehicleId) throw new HttpsError('invalid-argument', 'vehicleId is required')
  if (!data.buyerVerificationId) {
    throw new HttpsError('invalid-argument', 'buyerVerificationId is required')
  }
  const sellerUid = request.auth?.uid
  if (!sellerUid) throw new HttpsError('unauthenticated', 'Sign-in required.')

  // Throws permission-denied if the caller no longer owns the vehicle —
  // which is also what makes this naturally idempotent against a second
  // call: once transferred once, the original seller fails this check on
  // any further attempt.
  await assertOwnsVehicle(data.vehicleId, sellerUid)

  const db = getFirestore()
  const buyerVerificationRef = db.collection('verifications').doc(data.buyerVerificationId)
  const buyerVerificationSnap = await buyerVerificationRef.get()
  if (!buyerVerificationSnap.exists) {
    throw new HttpsError('not-found', 'Buyer verification not found.')
  }
  const buyerVerification = buyerVerificationSnap.data() as VerificationDoc

  if (buyerVerification.type !== 'buyer') {
    throw new HttpsError('failed-precondition', 'This is not a buyer re-verification.')
  }
  if (buyerVerification.status !== 'completed') {
    throw new HttpsError('failed-precondition', 'The buyer re-verification is not completed yet.')
  }
  if (buyerVerification.vehicleId !== data.vehicleId) {
    throw new HttpsError('failed-precondition', 'This verification is for a different vehicle.')
  }
  if (buyerVerification.transactionDecision !== 'purchased') {
    throw new HttpsError(
      'failed-precondition',
      'The buyer has not confirmed a purchase (transactionDecision !== "purchased").',
    )
  }
  const buyerUid = buyerVerification.userId
  if (!buyerUid) {
    throw new HttpsError('failed-precondition', 'Buyer verification has no owning user.')
  }
  if (buyerUid === sellerUid) {
    throw new HttpsError('failed-precondition', 'Buyer and seller cannot be the same account.')
  }

  // Confirm this buyer re-verification is actually a re-check of THIS
  // seller's own verification, not just coincidentally the same vehicle id
  // (e.g. a vehicle re-registered under a different seller in between).
  if (!buyerVerification.relatedVerificationId) {
    throw new HttpsError(
      'failed-precondition',
      'Buyer verification is not linked to a seller verification.',
    )
  }
  const sellerVerificationSnap = await db
    .collection('verifications')
    .doc(buyerVerification.relatedVerificationId)
    .get()
  const sellerVerification = sellerVerificationSnap.data() as VerificationDoc | undefined
  if (!sellerVerification || sellerVerification.userId !== sellerUid) {
    throw new HttpsError(
      'failed-precondition',
      'The linked seller verification does not belong to this account.',
    )
  }

  // The matching PUBLISHED listing, if any — gives the transaction record
  // its price snapshot and gets flipped to 'sold' (which is also what pulls
  // it out of the marketplace: homeContentService.listMarketplaceListings
  // only ever queries status=='published', so this one write is the whole
  // mechanism — no separate "hide it" step exists or is needed).
  // Deliberately never a 'draft' listing — a draft was never visible on the
  // marketplace in the first place, so there is nothing for a sale to have
  // come from; leaving it alone also means the seller's own abandoned draft
  // doesn't silently vanish/misreport as 'sold'. A vehicle sold without any
  // published listing (or whose listing was since deleted) still transfers;
  // it just has no listingId/priceTwd to record.
  const listingSnap = await db
    .collection('marketplaceListings')
    .where('vehicleId', '==', data.vehicleId)
    .where('sellerId', '==', sellerUid)
    .where('status', '==', 'published')
    .get()
  const listingDoc = listingSnap.docs[0]
  const listing = listingDoc?.data() as ListingDoc | undefined

  const now = Timestamp.now()
  const transactionRef = db.collection('transactions').doc()
  const batch = db.batch()
  batch.set(
    db.collection('vehicles').doc(data.vehicleId),
    { currentOwnerId: buyerUid, updatedAt: Date.now() },
    { merge: true },
  )
  if (listingDoc) {
    batch.set(listingDoc.ref, { status: 'sold' }, { merge: true })
  }
  batch.set(transactionRef, {
    buyerId: buyerUid,
    sellerId: sellerUid,
    vehicleId: data.vehicleId,
    listingId: listingDoc?.id ?? null,
    vehicleSnapshot: listing?.vehicleSnapshot ?? null,
    priceTwd: listing?.priceTwd ?? null,
    completedAt: now,
    createdAt: now,
  })
  await batch.commit()

  // Tell the OLD owner (the seller) — they lose read access to the vehicle
  // doc itself the instant this commits (firestore.rules' currentOwnerId
  // check), so this notification (keyed by their own uid, not the vehicle)
  // is the only place left they can still be reached about it. AppLayout.vue
  // shows a blocking "了解" modal for this type — see
  // VehicleTransferredModal.vue.
  const vehicleLabel =
    `${listing?.vehicleSnapshot?.brand ?? ''} ${listing?.vehicleSnapshot?.model ?? ''}`.trim() ||
    '這台車'
  const title = '車輛已轉移'
  const body = `你的「${vehicleLabel}」已經轉移給新車主。`
  await notifyUser(sellerUid, { type: 'vehicle_transferred', title, body }, { title, body })

  return { transactionId: transactionRef.id, listingId: listingDoc?.id ?? null }
})
