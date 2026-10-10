import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { getFirestore } from 'firebase-admin/firestore'
import { createInviteForVehicle } from '../vehicle-transfer-invite'
import { sendSystemMessage } from '../../services/chat.service'
import { findConversationId } from '../../services/conversation-lookup.service'

interface DealReport {
  dealConfirmed: boolean
  priceTwd: number | null
}

interface AppointmentDoc {
  buyerId?: string
  buyerDealReport?: DealReport
  sellerDealReport?: DealReport
  transferInviteCode?: string | null
}

interface ListingDoc {
  sellerId?: string
  vehicleId?: string
  vehicleSnapshot?: { brand: string; model: string }
}

/**
 * "有成交嗎？" — once BOTH sides of a 看車預約 independently answer yes
 * (ChatRoomView.vue, after scheduledAt has passed; see firestore.rules'
 * buyerDealReport/sellerDealReport write rules for why this is safe to read
 * here as a settled fact rather than re-validating it), this generates a
 * 車輛轉移邀請碼 (reusing createInviteForVehicle — the same code
 * VehicleDetailView.vue's "產生轉移邀請碼" menu item and MyListingManageView
 * .vue's "轉移號碼" section call) and posts it straight into the
 * conversation as a system message, so the seller doesn't have to remember
 * to separately go generate and hand over a code after the fact.
 *
 * `transferInviteCode` on the appointment doc is written in the SAME pass
 * that generates the code, which is what stops this trigger from ever
 * firing twice for the same appointment — a later unrelated write to this
 * doc still re-runs the trigger, but `after.transferInviteCode` is already
 * set by then and the guard below short-circuits immediately.
 */
export const onAppointmentDealConfirmed = onDocumentUpdated(
  'marketplaceListings/{listingId}/appointments/{appointmentId}',
  async (event) => {
    const after = event.data?.after.data() as AppointmentDoc | undefined
    if (!after) return
    if (after.transferInviteCode) return
    if (!after.buyerDealReport?.dealConfirmed || !after.sellerDealReport?.dealConfirmed) return
    if (!after.buyerId) return

    const { listingId, appointmentId } = event.params
    const db = getFirestore()
    const appointmentRef = db
      .collection('marketplaceListings')
      .doc(listingId)
      .collection('appointments')
      .doc(appointmentId)
    const listingSnap = await db.collection('marketplaceListings').doc(listingId).get()
    const listing = listingSnap.data() as ListingDoc | undefined
    if (!listing?.sellerId || !listing.vehicleId) return

    const { code } = await createInviteForVehicle(db, listing.vehicleId, listing.sellerId)
    await appointmentRef.set({ transferInviteCode: code }, { merge: true })

    const vehicleName = listing.vehicleSnapshot
      ? `${listing.vehicleSnapshot.brand} ${listing.vehicleSnapshot.model}`
      : '這台車'
    const conversationId = await findConversationId(db, listing.sellerId, after.buyerId, listingId)
    if (!conversationId) return
    await sendSystemMessage(
      conversationId,
      listing.sellerId,
      [after.buyerId],
      `雙方都確認 ${vehicleName} 已經成交了！轉移碼：${code}（48 小時內有效，買家請至「我的車輛」右上角＋選擇「車輛轉移」輸入此碼，完成過戶取得這台車的過去資料）。`,
    )
  },
)
