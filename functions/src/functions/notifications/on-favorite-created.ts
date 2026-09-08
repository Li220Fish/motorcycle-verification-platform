import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { getFirestore } from 'firebase-admin/firestore'
import { createNotification } from '../../services/notification.service'

interface ListingDoc {
  sellerId: string
  vehicleSnapshot: { brand: string; model: string }
}

/** users/{uid}/favoriteListings/{listingId} — doc ID IS the listing ID
 *  (see listing.service.ts's addFavorite), the trigger param below matches. */
export const onFavoriteCreated = onDocumentCreated(
  'users/{uid}/favoriteListings/{listingId}',
  async (event) => {
    const { uid, listingId } = event.params
    const db = getFirestore()
    const listingSnap = await db.collection('marketplaceListings').doc(listingId).get()
    const listing = listingSnap.data() as ListingDoc | undefined
    if (!listing || listing.sellerId === uid) return

    const vehicleName = `${listing.vehicleSnapshot.brand} ${listing.vehicleSnapshot.model}`
    await createNotification(listing.sellerId, {
      type: 'listing_favorited',
      title: '有人收藏了你的刊登',
      body: `${vehicleName} 被加入收藏`,
      link: `/marketplace/${listingId}`,
    })
  },
)
