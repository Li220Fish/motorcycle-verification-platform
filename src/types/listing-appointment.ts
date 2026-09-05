/** A buyer's requested viewing time for a listing — written by the buyer
 * from the listing detail page, read by the seller on their listing's
 * management page. The seller confirms/declines it from the chat room with
 * that buyer (see ChatRoomView.vue's appointment banner) — 'pending' until
 * then. */
export interface ListingAppointment {
  id: string
  listingId: string
  buyerId: string
  buyerName: string
  scheduledAt: number
  note?: string
  status: 'pending' | 'approved' | 'declined'
  createdAt: number
}

export type ListingAppointmentDraft = Omit<ListingAppointment, 'id' | 'createdAt' | 'status'>
