/** One side's answer to "有成交嗎？" — see ListingAppointment.buyerDealReport/
 *  sellerDealReport below. Immutable once written (firestore.rules only
 *  allows writing this field while it's still unset), same "once true,
 *  never reconsidered" posture as isPublic elsewhere in this app. */
export interface AppointmentDealReport {
  dealConfirmed: boolean
  priceTwd: number | null
  respondedAt: number
}

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
  /** 'completed' — the seller's own honor-system confirmation that the
   *  viewing actually happened (MyListingManageView.vue's "標記已完成看
   *  車"), only reachable from 'approved'. Feeds the 交易評分
   *  appointment-kept bonus for both parties via a Firestore trigger (see
   *  functions/src/functions/score/on-appointment-completed.ts) — not a
   *  verified check-in, just a seller-declared "this meeting happened",
   *  which is why that bonus stays small. Independent of the deal-report
   *  fields below — a viewing can complete without a sale, or vice versa
   *  (buyer/seller could still confirm a deal without the seller ever
   *  bothering to mark 完成看車). */
  status: 'pending' | 'approved' | 'declined' | 'cancelled' | 'completed'
  createdAt: number

  /** Once `scheduledAt` has passed on an 'approved' appointment,
   *  ChatRoomView.vue swaps its banner to ask each side "有成交嗎？" —
   *  these are each side's own independent answer. When BOTH report
   *  dealConfirmed:true, onAppointmentDealConfirmed.ts (functions/src/
   *  functions/notifications/on-appointment-deal-confirmed.ts) auto-
   *  generates a 車輛轉移邀請碼 for the vehicle and posts it into this
   *  conversation as a system message — see transferInviteCode below. */
  buyerDealReport?: AppointmentDealReport
  sellerDealReport?: AppointmentDealReport
  /** Set once onAppointmentDealConfirmed.ts has generated a code for this
   *  appointment — purely an idempotency guard against generating a second
   *  code on some later unrelated write to the same doc; the actual code
   *  value only ever reaches either party through the system chat message,
   *  never read back off this field by the client. */
  transferInviteCode?: string | null
}

export type ListingAppointmentDraft = Omit<
  ListingAppointment,
  'id' | 'createdAt' | 'status' | 'buyerDealReport' | 'sellerDealReport' | 'transferInviteCode'
>
