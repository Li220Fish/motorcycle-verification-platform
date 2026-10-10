import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'

/**
 * 車輛過戶 — thin wrapper over the Trusted Backend's transferVehicleOwnership
 * (functions/src/functions/transfer-vehicle-ownership.ts), the only place
 * vehicles/{id}.currentOwnerId can ever actually change. Client only ever
 * passes vehicleId + which buyer verification to transfer to; every
 * eligibility check (completed, linked to this seller, transactionDecision
 * === 'purchased') happens server-side and this call simply throws if any
 * of them fail — see that Function's own doc comment for the full rule.
 */
export interface TransferVehicleOwnershipResult {
  transactionId: string
  listingId: string | null
}

export async function transferVehicleOwnership(params: {
  vehicleId: string
  buyerVerificationId: string
}): Promise<TransferVehicleOwnershipResult> {
  const call = httpsCallable<typeof params, TransferVehicleOwnershipResult>(
    functions,
    'transferVehicleOwnership',
  )
  const response = await call(params)
  return response.data
}

/**
 * 車輛轉移邀請碼 — a second, person-to-person path to the same ownership
 * move above (see functions/src/functions/vehicle-transfer-invite.ts's own
 * doc comment): the current owner generates a short code (createInvite,
 * from VehicleDetailView.vue's "..." menu or MyListingManageView.vue's 刊登
 * 狀態 section) and hands it to the new owner by any channel; the new owner
 * enters it on VehicleTransferView.vue, which calls peekInvite first (to
 * confirm "是這台車") and then redeemInvite — the code itself is the only
 * gate, no further document upload/verification required.
 */
export interface CreateVehicleTransferInviteResult {
  code: string
  expiresAt: number
}

export async function createVehicleTransferInvite(
  vehicleId: string,
): Promise<CreateVehicleTransferInviteResult> {
  const call = httpsCallable<{ vehicleId: string }, CreateVehicleTransferInviteResult>(
    functions,
    'createVehicleTransferInvite',
  )
  const response = await call({ vehicleId })
  return response.data
}

export interface PeekVehicleTransferInviteResult {
  vehicleId: string
  brand: string
  model: string
  manufactureYear: number | null
  photo: string | null
}

export async function peekVehicleTransferInvite(
  code: string,
): Promise<PeekVehicleTransferInviteResult> {
  const call = httpsCallable<{ code: string }, PeekVehicleTransferInviteResult>(
    functions,
    'peekVehicleTransferInvite',
  )
  const response = await call({ code })
  return response.data
}

export interface RedeemVehicleTransferInviteResult {
  vehicleId: string
}

export async function redeemVehicleTransferInvite(
  code: string,
): Promise<RedeemVehicleTransferInviteResult> {
  const call = httpsCallable<{ code: string }, RedeemVehicleTransferInviteResult>(
    functions,
    'redeemVehicleTransferInvite',
  )
  const response = await call({ code })
  return response.data
}
