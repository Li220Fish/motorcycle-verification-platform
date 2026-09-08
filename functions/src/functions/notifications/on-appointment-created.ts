import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { getFirestore } from 'firebase-admin/firestore'
import { createNotification } from '../../services/notification.service'

interface ListingDoc {
  sellerId: string
  vehicleSnapshot: { brand: string; model: string }
}

interface AppointmentDoc {
  buyerId: string
  buyerName: string
}

export const onAppointmentCreated = onDocumentCreated(
  'marketplaceListings/{listingId}/appointments/{appointmentId}',
  async (event) => {
    const appointment = event.data?.data() as AppointmentDoc | undefined
    if (!appointment) return

    const { listingId } = event.params
    const db = getFirestore()
    const listingSnap = await db.collection('marketplaceListings').doc(listingId).get()
    const listing = listingSnap.data() as ListingDoc | undefined
    if (!listing || listing.sellerId === appointment.buyerId) return

    const vehicleName = `${listing.vehicleSnapshot.brand} ${listing.vehicleSnapshot.model}`
    await createNotification(listing.sellerId, {
      type: 'booking_request',
      title: '新的看車預約',
      body: `${appointment.buyerName} 預約看 ${vehicleName}`,
      link: `/marketplace/${listingId}`,
    })
  },
)
