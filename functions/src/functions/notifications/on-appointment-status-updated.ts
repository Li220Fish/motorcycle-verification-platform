import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { createNotification } from '../../services/notification.service'
import { findConversationId } from '../../services/conversation-lookup.service'

interface ListingDoc {
  sellerId: string
  vehicleSnapshot: { brand: string; model: string }
}

interface AppointmentDoc {
  buyerId: string
  scheduledAt: Timestamp
  status?: 'pending' | 'approved' | 'declined' | 'cancelled'
}

function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * The seller approving/declining a booking used to only ever reach the
 * buyer as a live in-chat toast (ChatRoomView.vue's appointmentToast) —
 * invisible unless the buyer happened to already be sitting in that exact
 * chat room the moment it happened. This writes a persistent notification
 * into the buyer's /notifications feed instead (same pattern as
 * on-appointment-created.ts, just for the seller's decision rather than the
 * buyer's original request), so it's there whenever they next check.
 */
export const onAppointmentStatusUpdated = onDocumentUpdated(
  'marketplaceListings/{listingId}/appointments/{appointmentId}',
  async (event) => {
    const before = event.data?.before.data() as AppointmentDoc | undefined
    const after = event.data?.after.data() as AppointmentDoc | undefined
    if (!before || !after) return
    if (before.status !== 'pending') return
    if (after.status !== 'approved' && after.status !== 'declined') return

    const { listingId } = event.params
    const db = getFirestore()
    const listingSnap = await db.collection('marketplaceListings').doc(listingId).get()
    const listing = listingSnap.data() as ListingDoc | undefined
    if (!listing) return

    const scheduledAt = after.scheduledAt?.toMillis?.() ?? Date.now()
    const vehicleName = `${listing.vehicleSnapshot.brand} ${listing.vehicleSnapshot.model}`
    const conversationId = await findConversationId(db, listing.sellerId, after.buyerId, listingId)
    const approved = after.status === 'approved'

    await createNotification(after.buyerId, {
      type: approved ? 'booking_approved' : 'booking_declined',
      title: approved ? '預約已同意' : '預約已婉拒',
      body: approved
        ? `賣家同意了您 ${formatDateTime(scheduledAt)} 賞車 ${vehicleName} 的預約`
        : `賣家婉拒了您 ${formatDateTime(scheduledAt)} 賞車 ${vehicleName} 的預約`,
      link: conversationId ? `/messages/${conversationId}` : `/marketplace/${listingId}`,
    })
  },
)
