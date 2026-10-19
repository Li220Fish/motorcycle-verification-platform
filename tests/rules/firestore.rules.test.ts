import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

import { ADMIN_UID, createEnv, seed } from './helpers'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await createEnv()
})
afterAll(async () => {
  await env.cleanup()
})
beforeEach(async () => {
  await env.clearFirestore()
})

const as = (uid: string) => env.authenticatedContext(uid).firestore()
const anon = () => env.unauthenticatedContext().firestore()
const admin = () => as(ADMIN_UID)

describe('vehicles', () => {
  beforeEach(() => seed(env, { 'vehicles/v1': { currentOwnerId: 'seller', brand: 'Y' } }))

  it('owner/admin read; others denied', async () => {
    await assertSucceeds(as('seller').doc('vehicles/v1').get())
    await assertSucceeds(admin().doc('vehicles/v1').get())
    await assertFails(as('buyer').doc('vehicles/v1').get())
    await assertFails(anon().doc('vehicles/v1').get())
  })

  it('create only for yourself, never with registrationVerification', async () => {
    await assertSucceeds(as('u1').doc('vehicles/new').set({ currentOwnerId: 'u1' }))
    await assertFails(as('u1').doc('vehicles/x').set({ currentOwnerId: 'someone-else' }))
    await assertFails(
      as('u1')
        .doc('vehicles/y')
        .set({ currentOwnerId: 'u1', registrationVerification: { status: 'passed' } }),
    )
  })

  it('owner cannot change currentOwnerId (transfer is backend-only)', async () => {
    await assertSucceeds(as('seller').doc('vehicles/v1').update({ brand: 'YAMAHA' }))
    await assertFails(as('seller').doc('vehicles/v1').update({ currentOwnerId: 'buyer' }))
    await assertFails(
      as('seller')
        .doc('vehicles/v1')
        .update({ registrationVerification: { status: 'passed' } }),
    )
    await assertSucceeds(admin().doc('vehicles/v1').update({ currentOwnerId: 'buyer' }))
  })

  it('fuel logs: owner only, recordedBy must be self', async () => {
    await assertSucceeds(
      as('seller').collection('vehicles/v1/fuelLogs').add({ recordedBy: 'seller' }),
    )
    await assertFails(as('seller').collection('vehicles/v1/fuelLogs').add({ recordedBy: 'x' }))
    await assertFails(as('buyer').collection('vehicles/v1/fuelLogs').add({ recordedBy: 'buyer' }))
  })
})

describe('verifications', () => {
  beforeEach(() =>
    seed(env, {
      'vehicles/v1': { currentOwnerId: 'seller' },
      'marketplaceListings/L1': { sellerId: 'seller', vehicleId: 'v1', status: 'published' },
      'marketplaceListings/L2': { sellerId: 'seller', vehicleId: 'other', status: 'published' },
      'verifications/private': {
        userId: 'seller',
        vehicleId: 'v1',
        isPublic: false,
        status: 'draft',
      },
      'verifications/public': {
        userId: 'seller',
        vehicleId: 'v1',
        isPublic: true,
        status: 'completed',
      },
      'verifications/public/answers/APR-rear': { itemId: 'APR-rear', result: 'normal' },
    }),
  )

  it('private: owner reads; strangers denied. public: any signed-in user can get, but not list', async () => {
    await assertSucceeds(as('seller').doc('verifications/private').get())
    await assertFails(as('stranger').doc('verifications/private').get())
    await assertSucceeds(as('stranger').doc('verifications/public').get())
    await assertSucceeds(as('stranger').doc('verifications/public/answers/APR-rear').get())
    await assertFails(
      as('stranger').collection('verifications').where('isPublic', '==', true).get(),
    )
    await assertFails(anon().doc('verifications/public').get())
  })

  it('seller creates on own vehicle; Trusted-Backend fields are rejected', async () => {
    const base = { userId: 'seller', vehicleId: 'v1', type: 'seller', isPublic: false }
    await assertSucceeds(as('seller').doc('verifications/n1').set(base))
    await assertFails(
      as('seller')
        .doc('verifications/n2')
        .set({ ...base, isPublic: true }),
    )
    await assertFails(
      as('seller')
        .doc('verifications/n3')
        .set({ ...base, analysisStatus: {} }),
    )
    await assertFails(
      as('seller')
        .doc('verifications/n4')
        .set({ ...base, coldStateContext: {} }),
    )
    await assertFails(
      as('seller')
        .doc('verifications/n5')
        .set({ ...base, userId: 'someone' }),
    )
  })

  it('buyer may create on the seller vehicle only via a matching listing', async () => {
    const buyer = { userId: 'buyer', vehicleId: 'v1', type: 'buyer', isPublic: false }
    await assertSucceeds(
      as('buyer')
        .doc('verifications/b1')
        .set({ ...buyer, listingId: 'L1' }),
    )
    await assertFails(as('buyer').doc('verifications/b2').set(buyer)) // no listing
    await assertFails(
      as('buyer')
        .doc('verifications/b3')
        .set({ ...buyer, listingId: 'L2' }),
    ) // wrong vehicle
    await assertFails(
      as('buyer')
        .doc('verifications/b4')
        .set({ ...buyer, type: 'seller', listingId: 'L1' }),
    )
  })

  it('public verifications are immutable, even for admin', async () => {
    await assertSucceeds(
      as('seller').doc('verifications/private').update({ status: 'in_progress' }),
    )
    await assertFails(as('seller').doc('verifications/public').update({ status: 'draft' }))
    await assertFails(admin().doc('verifications/public').update({ status: 'draft' }))
    await assertFails(
      as('seller')
        .doc('verifications/private')
        .update({ analysisStatus: { x: 1 } }),
    )
  })

  it('answers: AI-managed items and aiResult are never client-writable', async () => {
    const ans = (id: string) => as('seller').doc(`verifications/private/answers/${id}`)
    await assertSucceeds(ans('APR-rear').set({ itemId: 'APR-rear', result: 'normal' }))
    await assertFails(ans('body_damage').set({ itemId: 'body_damage', result: 'normal' }))
    await assertFails(
      ans('ENG-03').set({ itemId: 'ENG-03', result: 'normal', aiResult: { label: 'x' } }),
    )
    await assertFails(
      as('stranger').doc('verifications/private/answers/APR-left-side').set({ result: 'normal' }),
    )
    await assertFails(
      as('seller').doc('verifications/public/answers/APR-rear').set({ result: 'attention' }),
    )
  })

  it('answers: owner can delete (attempt reset), and update without touching aiResult', async () => {
    await seed(env, {
      'verifications/private/answers/ENG-02': {
        itemId: 'ENG-02',
        result: 'normal',
        aiResult: { label: 'ai' },
      },
    })
    await assertSucceeds(
      as('seller').doc('verifications/private/answers/ENG-02').update({ note: 'mine' }),
    )
    await assertFails(
      as('seller')
        .doc('verifications/private/answers/ENG-02')
        .update({ aiResult: { label: 'forged' } }),
    )
    await assertSucceeds(as('seller').doc('verifications/private/answers/ENG-02').delete())
  })

  it('delete: owner while private; admin always', async () => {
    await assertFails(as('seller').doc('verifications/public').delete())
    await assertSucceeds(as('seller').doc('verifications/private').delete())
    await assertSucceeds(admin().doc('verifications/public').delete())
  })
})

describe('marketplace listings & appointments', () => {
  beforeEach(() =>
    seed(env, {
      'marketplaceListings/pub': {
        sellerId: 'seller',
        status: 'published',
        vehicleId: 'v',
        verificationIds: ['x'],
        favoriteCount: 0,
        appointmentCount: 0,
        priceTwd: 1,
      },
      'marketplaceListings/draft': {
        sellerId: 'seller',
        status: 'draft',
        vehicleId: 'v',
        verificationIds: ['x'],
        favoriteCount: 0,
        appointmentCount: 0,
      },
      'marketplaceListings/pub/appointments/a1': {
        buyerId: 'buyer',
        status: 'pending',
        listingId: 'pub',
      },
      'marketplaceListings/pub/appointments/a2': {
        buyerId: 'other',
        status: 'approved',
        listingId: 'pub',
      },
      'marketplaceListings/pub/appointments/a3': {
        buyerId: 'buyer',
        status: 'approved',
        listingId: 'pub',
      },
    }),
  )

  it('published is readable by anyone signed in; drafts only by the seller', async () => {
    await assertSucceeds(as('buyer').doc('marketplaceListings/pub').get())
    await assertFails(as('buyer').doc('marketplaceListings/draft').get())
    await assertSucceeds(as('seller').doc('marketplaceListings/draft').get())
    await assertSucceeds(
      as('buyer').collection('marketplaceListings').where('status', '==', 'published').get(),
    )
  })

  it('counters only move by exactly one', async () => {
    await assertSucceeds(as('buyer').doc('marketplaceListings/pub').update({ favoriteCount: 1 }))
    await assertFails(as('buyer').doc('marketplaceListings/pub').update({ favoriteCount: 99 }))
    await assertFails(as('buyer').doc('marketplaceListings/pub').update({ priceTwd: 0 }))
  })

  it('seller: publish once, delist/relist, but never change status in a general edit', async () => {
    await assertSucceeds(
      as('seller').doc('marketplaceListings/draft').update({ status: 'published' }),
    )
    await assertSucceeds(as('seller').doc('marketplaceListings/pub').update({ status: 'delisted' }))
    await assertSucceeds(
      as('seller').doc('marketplaceListings/pub').update({ status: 'published' }),
    )
    await assertFails(as('seller').doc('marketplaceListings/pub').update({ status: 'sold' }))
    await assertSucceeds(as('seller').doc('marketplaceListings/pub').update({ priceTwd: 2 }))
  })

  it('buyer collection-group query: own appointments only (1-hour reminder lookup)', async () => {
    await assertSucceeds(
      as('buyer').collectionGroup('appointments').where('buyerId', '==', 'buyer').get(),
    )
    await assertFails(as('buyer').collectionGroup('appointments').get())
    await assertFails(
      as('buyer').collectionGroup('appointments').where('buyerId', '==', 'other').get(),
    )
  })

  it('appointment create/transition rules', async () => {
    await assertSucceeds(
      as('buyer')
        .collection('marketplaceListings/pub/appointments')
        .add({ buyerId: 'buyer', status: 'pending' }),
    )
    await assertFails(
      as('buyer')
        .collection('marketplaceListings/pub/appointments')
        .add({ buyerId: 'buyer', status: 'approved' }),
    )
    await assertFails(
      as('buyer').doc('marketplaceListings/pub/appointments/a1').update({ status: 'approved' }),
    )
    await assertSucceeds(
      as('seller').doc('marketplaceListings/pub/appointments/a1').update({ status: 'approved' }),
    )
    await assertSucceeds(
      as('buyer').doc('marketplaceListings/pub/appointments/a3').update({ status: 'cancelled' }),
    )
    await assertSucceeds(
      as('seller').doc('marketplaceListings/pub/appointments/a2').update({ status: 'completed' }),
    )
  })

  it('deal reports: each side once, own field only', async () => {
    const report = { dealConfirmed: true, priceTwd: 1, respondedAt: 1 }
    await assertSucceeds(
      as('buyer')
        .doc('marketplaceListings/pub/appointments/a3')
        .update({ buyerDealReport: report }),
    )
    await assertFails(
      as('buyer')
        .doc('marketplaceListings/pub/appointments/a3')
        .update({ buyerDealReport: { ...report, dealConfirmed: false } }),
    )
    await assertFails(
      as('buyer')
        .doc('marketplaceListings/pub/appointments/a3')
        .update({ sellerDealReport: report }),
    )
    await assertSucceeds(
      as('seller')
        .doc('marketplaceListings/pub/appointments/a3')
        .update({ sellerDealReport: report }),
    )
  })
})

describe('users & profile', () => {
  beforeEach(() =>
    seed(env, {
      'users/u1': { accountTier: 'standard', createdAt: 1, score: 5, displayName: 'A' },
    }),
  )

  it('self read/update, but score/tier/createdAt are locked', async () => {
    await assertSucceeds(as('u1').doc('users/u1').get())
    await assertFails(as('u2').doc('users/u1').get())
    await assertSucceeds(as('u1').doc('users/u1').update({ displayName: 'B' }))
    await assertFails(as('u1').doc('users/u1').update({ score: 999 }))
    await assertFails(as('u1').doc('users/u1').update({ accountTier: 'dealer' }))
    await assertSucceeds(admin().doc('users/u1').update({ score: 6 }))
  })

  it('notifications: read own, flip read only, never create', async () => {
    await seed(env, { 'users/u1/notifications/n1': { read: false, title: 't' } })
    await assertSucceeds(as('u1').doc('users/u1/notifications/n1').update({ read: true }))
    await assertFails(as('u1').doc('users/u1/notifications/n1').update({ title: 'x' }))
    await assertFails(as('u1').collection('users/u1/notifications').add({ title: 'spoof' }))
    await assertFails(as('u2').doc('users/u1/notifications/n1').get())
  })

  it('score events are read-only audit trail', async () => {
    await seed(env, { 'users/u1/scoreEvents/e1': { delta: 1 } })
    await assertSucceeds(as('u1').doc('users/u1/scoreEvents/e1').get())
    await assertFails(as('u1').doc('users/u1/scoreEvents/e2').set({ delta: 100 }))
  })

  it('public avatars: readable by all, writable only by owner', async () => {
    await assertSucceeds(as('u1').doc('publicAvatars/u1').set({ photoUrl: 'x' }))
    await assertFails(as('u2').doc('publicAvatars/u1').set({ photoUrl: 'y' }))
    await assertSucceeds(as('u2').doc('publicAvatars/u1').get())
  })
})

describe('conversations & messages', () => {
  beforeEach(() => seed(env, { 'conversations/c1': { memberIds: ['a', 'b'] } }))

  it('members only; membership is fixed', async () => {
    await assertSucceeds(as('a').doc('conversations/c1').get())
    await assertFails(as('z').doc('conversations/c1').get())
    await assertFails(
      as('a')
        .doc('conversations/c1')
        .update({ memberIds: ['a', 'z'] }),
    )
    await assertSucceeds(as('a').doc('conversations/c1').update({ tag: '交易中' }))
    await assertFails(
      as('a')
        .doc('conversations/c2')
        .set({ memberIds: ['a', 'b', 'c'] }),
    )
  })

  it('messages: member sends as self, allowed types only, immutable', async () => {
    const msgs = (uid: string) => as(uid).collection('conversations/c1/messages')
    const ref = await assertSucceeds(msgs('a').add({ senderId: 'a', type: 'text', text: 'hi' }))
    await assertFails(msgs('a').add({ senderId: 'b', type: 'text' }))
    await assertFails(msgs('z').add({ senderId: 'z', type: 'text' }))
    await assertFails(msgs('a').add({ senderId: 'a', type: 'payment' }))
    await assertFails(as('a').doc(`conversations/c1/messages/${ref.id}`).update({ text: 'edited' }))
  })
})

describe('discussion', () => {
  beforeEach(() =>
    seed(env, {
      'discussionPosts/p1': { authorId: 'a', likeCount: 0, commentCount: 0, title: 't' },
    }),
  )

  it('likeCount/commentCount move by exactly one; only author edits', async () => {
    await assertSucceeds(as('b').doc('discussionPosts/p1').update({ likeCount: 1 }))
    await assertFails(as('b').doc('discussionPosts/p1').update({ likeCount: 10 }))
    await assertFails(as('b').doc('discussionPosts/p1').update({ title: 'hacked' }))
    await assertSucceeds(as('a').doc('discussionPosts/p1').update({ title: 'edited' }))
  })

  it('reports: create as self, only admin reads, nobody deletes', async () => {
    const ref = await assertSucceeds(
      as('b').collection('discussionReports').add({ reporterId: 'b', targetId: 'p1' }),
    )
    await assertFails(as('b').doc(`discussionReports/${ref.id}`).get())
    await assertSucceeds(admin().doc(`discussionReports/${ref.id}`).get())
    await assertFails(admin().doc(`discussionReports/${ref.id}`).delete())
  })
})

describe('backend-only & admin-only collections', () => {
  it('vehicleTransferInvites are closed to every client', async () => {
    await seed(env, { 'vehicleTransferInvites/ABC': { vehicleId: 'v' } })
    await assertFails(as('u1').doc('vehicleTransferInvites/ABC').get())
    await assertFails(admin().doc('vehicleTransferInvites/ABC').get())
  })

  it('reference content: read for signed-in, write for admin', async () => {
    await assertSucceeds(as('u1').doc('vehicleModels/m1').get())
    await assertFails(as('u1').doc('vehicleModels/m1').set({ brand: 'x' }))
    await assertSucceeds(admin().doc('vehicleModels/m1').set({ brand: 'x' }))
    await assertFails(as('u1').doc('aiPrompts/k').get())
    await assertSucceeds(admin().doc('aiPrompts/k').set({ text: 't' }))
  })

  it('transactions readable by its parties; written by admin/backend only', async () => {
    await seed(env, { 'transactions/t1': { buyerId: 'b', sellerId: 's' } })
    await assertSucceeds(as('b').doc('transactions/t1').get())
    await assertFails(as('z').doc('transactions/t1').get())
    await assertFails(as('b').doc('transactions/t2').set({ buyerId: 'b', sellerId: 's' }))
  })

  it('training data: collectors upload pending captures, only admin reviews', async () => {
    await seed(env, { 'dataCollectors/c1': { email: 'c@x' } })
    const cap = { collectorUid: 'c1', status: 'pending', annotations: null }
    await assertSucceeds(as('c1').doc('trainingCaptures/x').set(cap))
    await assertFails(
      as('nobody')
        .doc('trainingCaptures/y')
        .set({ ...cap, collectorUid: 'nobody' }),
    )
    await assertFails(
      as('c1')
        .doc('trainingCaptures/z')
        .set({ ...cap, status: 'approved' }),
    )
    await assertFails(as('c1').doc('trainingCaptures/x').update({ status: 'approved' }))
    await assertSucceeds(admin().doc('trainingCaptures/x').update({ status: 'approved' }))
  })

  it('dev-log is intentionally open; unknown collections are denied', async () => {
    await assertSucceeds(anon().doc('devlog_submissions/x').set({ a: 1 }))
    await assertFails(as('u1').doc('somethingNew/x').set({ a: 1 }))
  })
})
