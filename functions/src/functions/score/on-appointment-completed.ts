import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { getFirestore } from 'firebase-admin/firestore'
import { SCORE_CONFIG } from '../../services/score.config'
import { recordScoreEvent } from '../../services/score.service'

interface AppointmentDoc {
  buyerId?: string
  status?: 'pending' | 'approved' | 'declined' | 'cancelled' | 'completed'
}

interface ListingDoc {
  sellerId?: string
}

/**
 * 交易評分 (users/{uid}.score) — appointment-kept leg (see score.config.ts's
 * top comment). Fires once, when a seller marks an approved appointment
 * `completed` (MyListingManageView.vue's "標記已完成看車" — see
 * firestore.rules' matching appointments update clause: only the listing's
 * seller may make this specific approved -> completed transition).
 *
 * HONEST CAVEAT: this is an honor-system confirmation, not a verified
 * check-in (no GPS/QR/photo proof) — the seller could mark a no-show as
 * completed by mistake or generosity. That is exactly why the bonus is kept
 * small (SCORE_CONFIG.appointmentKeptDelta) relative to the disclosure leg:
 * it is meant to reward the baseline courtesy of a confirmed meeting, not
 * to carry much evidentiary weight on its own.
 */
export const onAppointmentCompleted = onDocumentUpdated(
  'marketplaceListings/{listingId}/appointments/{appointmentId}',
  async (event) => {
    const before = event.data?.before.data() as AppointmentDoc | undefined
    const after = event.data?.after.data() as AppointmentDoc | undefined
    if (!before || !after) return
    if (before.status === 'completed' || after.status !== 'completed') return
    if (!after.buyerId) return

    const { listingId, appointmentId } = event.params
    const db = getFirestore()
    const listingSnap = await db.collection('marketplaceListings').doc(listingId).get()
    const listing = listingSnap.data() as ListingDoc | undefined
    const sellerUid = listing?.sellerId
    if (!sellerUid) return

    await Promise.all([
      recordScoreEvent(after.buyerId, SCORE_CONFIG.appointmentKeptDelta, 'appointment_kept', {
        listingId,
        appointmentId,
      }),
      recordScoreEvent(sellerUid, SCORE_CONFIG.appointmentKeptDelta, 'appointment_kept', {
        listingId,
        appointmentId,
      }),
    ])
  },
)
