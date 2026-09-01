/** A buyer's requested viewing time for a listing — written by the buyer
 * from the listing detail page, read by the seller on their listing's
 * management page. No confirm/decline flow yet (MVP): booking it is enough
 * for the seller to see it and follow up via 聊聊. */
export interface ListingAppointment {
  id: string
  listingId: string
  buyerId: string
  buyerName: string
  scheduledAt: number
  note?: string
  createdAt: number
}

export type ListingAppointmentDraft = Omit<ListingAppointment, 'id' | 'createdAt'>
