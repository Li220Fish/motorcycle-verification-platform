import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { assertOwnsVehicle } from '../services/auth.service'
import { notifyUser } from '../services/notification-dispatch.service'

// 6 碼，0-9/A-Z 各碼獨立隨機抽取（因此允許同碼重複），48 小時後失效即需重新
// 產生 — exact spec from MyListingManageView.vue's "轉移號碼" (the same code
// also generatable from VehicleDetailView.vue's "產生轉移邀請碼" menu item;
// both are just entry points onto this one function).
const CODE_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const CODE_LENGTH = 6
const INVITE_TTL_MS = 48 * 60 * 60 * 1000

interface VehicleDoc {
  currentOwnerId?: string
  brand?: string
  model?: string
  manufactureYear?: number | null
  photos?: string[]
}

interface ListingDoc {
  sellerId?: string
  vehicleId?: string
  status?: string
  priceTwd?: number
  vehicleSnapshot?: { brand: string; model: string }
}

interface InviteDoc {
  vehicleId: string
  createdBy: string
  createdAt: Timestamp
  expiresAt: Timestamp
  used: boolean
  usedBy?: string
  usedAt?: Timestamp
}

function generateCode(): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  }
  return code
}

function assertRealAccount(uid: string | undefined, isAnonymous: boolean | undefined): string {
  if (!uid) throw new HttpsError('unauthenticated', 'Sign-in required.')
  if (isAnonymous) {
    throw new HttpsError('failed-precondition', '請先登入正式帳號才能進行車輛轉移。')
  }
  return uid
}

/**
 * The actual code-generation + Firestore write, pulled out of
 * createVehicleTransferInvite below so onAppointmentDealConfirmed.ts
 * (functions/src/functions/notifications/on-appointment-deal-confirmed.ts)
 * can reuse it when BOTH sides of a 看車預約 independently confirm a deal
 * happened — that path has no HTTPS caller to run assertOwnsVehicle/
 * assertRealAccount against (it's a Firestore trigger, not an onCall), so
 * those checks stay in the onCall wrapper and this helper takes the seller
 * uid as a given.
 */
export async function createInviteForVehicle(
  db: ReturnType<typeof getFirestore>,
  vehicleId: string,
  createdBy: string,
): Promise<{ code: string; expiresAt: Timestamp }> {
  const now = Timestamp.now()
  const expiresAt = Timestamp.fromMillis(now.toMillis() + INVITE_TTL_MS)

  // Vanishingly unlikely to collide (8 chars from a 33-char alphabet) but
  // cheap to guard anyway rather than ever silently overwrite another
  // vehicle's live invite.
  let code = generateCode()
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await db.collection('vehicleTransferInvites').doc(code).get()
    if (!existing.exists) break
    code = generateCode()
  }

  const invite: InviteDoc = { vehicleId, createdBy, createdAt: now, expiresAt, used: false }
  await db.collection('vehicleTransferInvites').doc(code).set(invite)
  return { code, expiresAt }
}

/**
 * 車輛轉移邀請碼 — a SEPARATE path to move `vehicles/{id}.currentOwnerId`
 * from transferVehicleOwnership (transfer-vehicle-ownership.ts), which only
 * ever fires out of a completed marketplace buyer re-verification. This one
 * is for a direct, person-to-person transfer with no listing/買家複驗
 * involved at all: the current owner generates a short code here and hands
 * it to the new owner by whatever channel they like (text message, in
 * person); the new owner redeems it below.
 *
 * `vehicleTransferInvites/{code}` is entirely Trusted-Backend-owned —
 * firestore.rules denies the client all read/write on it, so every check
 * (ownership to create, validity/expiry/not-self to redeem) has to happen
 * inside these Functions.
 */
export const createVehicleTransferInvite = onCall({}, async (request) => {
  const data = request.data as { vehicleId?: string }
  if (!data.vehicleId) throw new HttpsError('invalid-argument', 'vehicleId is required')
  const uid = assertRealAccount(
    request.auth?.uid,
    request.auth?.token.firebase?.sign_in_provider === 'anonymous',
  )
  await assertOwnsVehicle(data.vehicleId, uid)

  const db = getFirestore()
  const { code, expiresAt } = await createInviteForVehicle(db, data.vehicleId, uid)
  return { code, expiresAt: expiresAt.toMillis() }
})

async function loadValidInvite(
  db: ReturnType<typeof getFirestore>,
  code: string,
): Promise<{ ref: FirebaseFirestore.DocumentReference; invite: InviteDoc }> {
  const ref = db.collection('vehicleTransferInvites').doc(code.trim().toUpperCase())
  const snap = await ref.get()
  if (!snap.exists) throw new HttpsError('not-found', '邀請碼不存在，請確認輸入是否正確。')
  const invite = snap.data() as InviteDoc
  if (invite.used) throw new HttpsError('failed-precondition', '這個邀請碼已經被使用過了。')
  if (invite.expiresAt.toMillis() < Date.now()) {
    throw new HttpsError('failed-precondition', '這個邀請碼已經過期，請請車主重新產生一個。')
  }
  return { ref, invite }
}

/**
 * Step 1 of redeeming — validates the code and returns just enough of the
 * vehicle's public identity (brand/model/year/first photo) for the new
 * owner to confirm "是這台車" before actually redeeming. Never returns
 * anything about the current owner's identity.
 */
export const peekVehicleTransferInvite = onCall({}, async (request) => {
  const data = request.data as { code?: string }
  if (!data.code) throw new HttpsError('invalid-argument', 'code is required')
  const uid = assertRealAccount(
    request.auth?.uid,
    request.auth?.token.firebase?.sign_in_provider === 'anonymous',
  )

  const db = getFirestore()
  const { invite } = await loadValidInvite(db, data.code)
  if (invite.createdBy === uid) {
    throw new HttpsError('failed-precondition', '不能轉移給自己。')
  }

  const vehicleSnap = await db.collection('vehicles').doc(invite.vehicleId).get()
  if (!vehicleSnap.exists) throw new HttpsError('not-found', '找不到這台車輛。')
  const vehicle = vehicleSnap.data() as VehicleDoc

  return {
    vehicleId: invite.vehicleId,
    brand: vehicle.brand ?? '',
    model: vehicle.model ?? '',
    manufactureYear: vehicle.manufactureYear ?? null,
    photo: vehicle.photos?.[0] ?? null,
  }
})

/**
 * Step 2 — the code alone is the whole gate now (2026-10: the 行照驗證
 * requirement this used to have before committing the ownership flip was
 * dropped — see this repo's own history for why, the short version being
 * it was decided redundant with the code itself already being short-lived,
 * single-use, and handed over by the current owner directly). Just
 * re-validates the invite (exists/unused/unexpired/not-self) and moves
 * `currentOwnerId` straight away.
 */
export const redeemVehicleTransferInvite = onCall({}, async (request) => {
  const data = request.data as { code?: string }
  if (!data.code) throw new HttpsError('invalid-argument', 'code is required')
  const uid = assertRealAccount(
    request.auth?.uid,
    request.auth?.token.firebase?.sign_in_provider === 'anonymous',
  )

  const db = getFirestore()
  const { ref: inviteRef, invite } = await loadValidInvite(db, data.code)
  if (invite.createdBy === uid) {
    throw new HttpsError('failed-precondition', '不能轉移給自己。')
  }

  const vehicleRef = db.collection('vehicles').doc(invite.vehicleId)
  const vehicleSnap = await vehicleRef.get()
  if (!vehicleSnap.exists) throw new HttpsError('not-found', '找不到這台車輛。')
  const vehicle = vehicleSnap.data() as VehicleDoc

  // Every one of the OLD owner's own listings for this vehicle, any status —
  // unlike transferVehicleOwnership's marketplace-sale path (which flips a
  // published listing to 'sold' and keeps it as a legitimate 已售出 record
  // in MyListingsView.vue), an invite-code transfer never went through a
  // real tracked sale on this listing at all, so there's no "sale" worth
  // keeping a record of here — the transactions doc below already captures
  // the ownership change itself. Deleting outright is what actually makes
  // it disappear from the old owner's 我的刊登; a status flip alone would
  // have just kept showing it there under a different badge.
  const listingSnap = await db
    .collection('marketplaceListings')
    .where('vehicleId', '==', invite.vehicleId)
    .where('sellerId', '==', invite.createdBy)
    .get()
  const referencedListingDoc =
    listingSnap.docs.find((d) => d.data().status === 'published') ?? listingSnap.docs[0]
  const listing = referencedListingDoc?.data() as ListingDoc | undefined

  const now = Timestamp.now()
  const transactionRef = db.collection('transactions').doc()
  const batch = db.batch()
  batch.set(vehicleRef, { currentOwnerId: uid, updatedAt: Date.now() }, { merge: true })
  batch.set(inviteRef, { used: true, usedBy: uid, usedAt: now }, { merge: true })
  for (const listingDoc of listingSnap.docs) {
    batch.delete(listingDoc.ref)
  }
  batch.set(transactionRef, {
    buyerId: uid,
    sellerId: invite.createdBy,
    vehicleId: invite.vehicleId,
    listingId: referencedListingDoc?.id ?? null,
    vehicleSnapshot: listing?.vehicleSnapshot ?? {
      brand: vehicle.brand ?? '',
      model: vehicle.model ?? '',
    },
    priceTwd: listing?.priceTwd ?? null,
    completedAt: now,
    createdAt: now,
  })
  await batch.commit()

  // Tell the OLD owner — they lose read access to the vehicle doc itself the
  // instant this commits (firestore.rules' currentOwnerId check), so this
  // notification (keyed by their own uid, not the vehicle) is the only place
  // left they can still be reached about it. AppLayout.vue shows a blocking
  // "了解" modal for this type specifically — see VehicleTransferredModal.vue.
  const vehicleLabel = `${vehicle.brand ?? ''} ${vehicle.model ?? ''}`.trim() || '這台車'
  const title = '車輛已轉移'
  const body = `你的「${vehicleLabel}」已經轉移給新車主。`
  await notifyUser(invite.createdBy, { type: 'vehicle_transferred', title, body }, { title, body })

  return { vehicleId: invite.vehicleId }
})
