import type { Firestore } from 'firebase-admin/firestore'

interface ConversationDoc {
  memberIds: string[]
  context?: { listingId?: string }
}

/**
 * Finds the 1:1 seller+buyer conversation for a given listing — the buyer
 * already creates (or reuses) this conversation client-side BEFORE writing
 * an appointment doc (see MarketplaceListingView.vue's handleBookingSubmit)
 * specifically so it's guaranteed to exist by the time any
 * appointment-related trigger runs. Same array-contains + client-side-filter
 * shape as conversation.service.ts's findOrCreateConversation, just queried
 * by the seller's membership from the admin SDK instead of the buyer's.
 * Shared by every appointment notification trigger (created/approved/
 * declined) so each notification's `link` can point straight at the chat
 * instead of the listing page.
 */
export async function findConversationId(
  db: Firestore,
  sellerId: string,
  buyerId: string,
  listingId: string,
): Promise<string | null> {
  const snapshot = await db
    .collection('conversations')
    .where('memberIds', 'array-contains', sellerId)
    .get()
  const match = snapshot.docs.find((docSnapshot) => {
    const data = docSnapshot.data() as ConversationDoc
    return (
      data.memberIds.length === 2 &&
      data.memberIds.includes(buyerId) &&
      data.context?.listingId === listingId
    )
  })
  return match?.id ?? null
}
