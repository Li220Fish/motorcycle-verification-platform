import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { listingAppointmentLookupService } from '@/services/firebase/listing-appointment-lookup.service'
import {
  listingService,
  type ListingDraft,
  toAppointment,
} from '@/services/firebase/listing.service'
import * as fs from '../fakes/firestore'

const NOW = new Date(2026, 9, 18, 12, 0).getTime()
const HOUR = 3_600_000
const snapshot = { brand: 'YAMAHA', model: 'MT-03' }

function draft(overrides: Partial<ListingDraft> = {}): ListingDraft {
  return {
    vehicleId: 'veh1',
    verificationIds: ['v1', 'v2'],
    brand: 'YAMAHA',
    model: 'MT-03',
    year: 2021,
    mileageKm: 8000,
    priceTwd: 150000,
    region: '台北市',
    district: '大安區',
    displacementCc: 321,
    transmission: '6速手排',
    color: '藍',
    modified: false,
    bodyType: null,
    powerType: 'gasoline',
    description: '',
    photos: ['p1'],
    sellerId: 's1',
    sellerName: 'Seller',
    sellerType: 'individual',
    sellerRating: 5,
    sellerReviewCount: 1,
    verificationScore: 90,
    ...overrides,
  }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})
afterEach(() => vi.useRealTimers())

describe('listing lifecycle', () => {
  it('reserveListingId returns a fresh id without writing', () => {
    const a = listingService.reserveListingId()
    const b = listingService.reserveListingId()
    expect(a).not.toBe(b)
    expect(fs.__paths()).toEqual([])
  })

  it('create writes a draft with a nested vehicleSnapshot and zeroed counters', async () => {
    await listingService.create('L1', draft())
    const saved = fs.__get('marketplaceListings/L1')!
    expect(saved).toMatchObject({
      status: 'draft',
      vehicleId: 'veh1',
      priceTwd: 150000,
      favoriteCount: 0,
      appointmentCount: 0,
      publishedAt: null,
      vehicleSnapshot: {
        brand: 'YAMAHA',
        model: 'MT-03',
        manufactureYear: 2021,
        mileage: 8000,
        modelId: null,
        powerType: 'gasoline',
      },
    })
    expect('description' in saved).toBe(false) // empty description omitted
  })

  it('publish flips the listing live and only touches verifications not yet public', async () => {
    await listingService.create('L1', draft())
    fs.__seed('verifications/v1', { isPublic: false })
    fs.__seed('verifications/v2', { isPublic: true, untouched: 'yes' })
    await listingService.publish('L1', ['v1', 'v2'])
    expect(fs.__get('marketplaceListings/L1')!.status).toBe('published')
    expect(fs.__get('marketplaceListings/L1')!.publishedAt).toBeInstanceOf(fs.Timestamp)
    expect(fs.__get('verifications/v1')!.isPublic).toBe(true)
    expect(fs.__get('verifications/v2')).toEqual({ isPublic: true, untouched: 'yes' })
  })

  it('delist / relist / update / updatePhotos', async () => {
    await listingService.create('L1', draft())
    await listingService.delist('L1')
    expect(fs.__get('marketplaceListings/L1')!.status).toBe('delisted')
    await listingService.relist('L1')
    expect(fs.__get('marketplaceListings/L1')!.status).toBe('published')
    await listingService.update('L1', {
      priceTwd: 140000,
      description: undefined,
      availableSlots: { '2026-10-20': ['17:00'] },
    })
    await listingService.updatePhotos('L1', ['a', 'b'])
    const saved = fs.__get('marketplaceListings/L1')!
    expect(saved.priceTwd).toBe(140000)
    expect(saved.availableSlots).toEqual({ '2026-10-20': ['17:00'] })
    expect((saved.vehicleSnapshot as { photos: string[] }).photos).toEqual(['a', 'b'])
    expect((saved.vehicleSnapshot as { brand: string }).brand).toBe('YAMAHA')
    expect(saved.updatedAt).toBeInstanceOf(fs.Timestamp)
  })

  it('get converts timestamps; null when missing', async () => {
    fs.__seed('marketplaceListings/L1', {
      createdAt: fs.Timestamp.fromMillis(5),
      publishedAt: 7,
      vehicleSnapshot: snapshot,
    })
    expect(await listingService.get('L1')).toMatchObject({ id: 'L1', createdAt: 5, publishedAt: 7 })
    fs.__seed('marketplaceListings/L2', { vehicleSnapshot: snapshot })
    expect(await listingService.get('L2')).toMatchObject({ createdAt: 0, publishedAt: null })
    expect(await listingService.get('nope')).toBeNull()
  })

  it('listBySeller drops DEMO listings without a vehicleId', async () => {
    fs.__seed('marketplaceListings/a', { sellerId: 's1', vehicleId: 'v' })
    fs.__seed('marketplaceListings/b', { sellerId: 's1' })
    fs.__seed('marketplaceListings/c', { sellerId: 's1', vehicleId: 'v' })
    fs.__seed('marketplaceListings/d', { sellerId: 's2', vehicleId: 'v' })
    expect((await listingService.listBySeller('s1')).map((l) => l.id)).toEqual(['c', 'a'])
  })

  it('subscribeListing reports null on a denied read', async () => {
    fs.__failNext('onSnapshot')
    const seen: unknown[] = []
    listingService.subscribeListing('L1', (l) => seen.push(l))
    await Promise.resolve()
    expect(seen).toEqual([null])
  })
})

describe('appointments', () => {
  beforeEach(async () => {
    await listingService.create('L1', draft())
  })

  it('createAppointment stores a pending appointment and bumps appointmentCount', async () => {
    const id = await listingService.createAppointment({
      listingId: 'L1',
      buyerId: 'b1',
      buyerName: 'Buyer',
      scheduledAt: NOW + HOUR,
      note: undefined,
    })
    const saved = fs.__get(`marketplaceListings/L1/appointments/${id}`)!
    expect(saved.status).toBe('pending')
    expect((saved.scheduledAt as fs.Timestamp).toMillis()).toBe(NOW + HOUR)
    expect(fs.__get('marketplaceListings/L1')!.appointmentCount).toBe(1)
  })

  it.each([
    ['approved', 1],
    ['declined', 0],
    ['cancelled', 0],
    ['completed', 0],
  ] as const)('status → %s leaves appointmentCount at %i', async (status, expected) => {
    const id = await listingService.createAppointment({
      listingId: 'L1',
      buyerId: 'b1',
      buyerName: 'B',
      scheduledAt: NOW,
    })
    await listingService.updateAppointmentStatus('L1', id, status)
    expect(fs.__get(`marketplaceListings/L1/appointments/${id}`)!.status).toBe(status)
    expect(fs.__get('marketplaceListings/L1')!.appointmentCount).toBe(expected)
  })

  it("submitDealReport writes only that side's report", async () => {
    const id = await listingService.createAppointment({
      listingId: 'L1',
      buyerId: 'b1',
      buyerName: 'B',
      scheduledAt: NOW,
    })
    await listingService.submitDealReport('L1', id, 'buyer', {
      dealConfirmed: true,
      priceTwd: 140000,
    })
    const saved = fs.__get(`marketplaceListings/L1/appointments/${id}`)!
    expect(saved.buyerDealReport).toEqual({
      dealConfirmed: true,
      priceTwd: 140000,
      respondedAt: NOW,
    })
    expect(saved.sellerDealReport).toBeUndefined()
  })

  it('listAppointments sorts by scheduledAt; legacy docs default to pending', async () => {
    fs.__seed('marketplaceListings/L1/appointments/late', {
      buyerId: 'b',
      scheduledAt: fs.Timestamp.fromMillis(NOW + 2 * HOUR),
      createdAt: fs.Timestamp.fromMillis(1),
    })
    fs.__seed('marketplaceListings/L1/appointments/early', {
      buyerId: 'b',
      scheduledAt: fs.Timestamp.fromMillis(NOW + HOUR),
      createdAt: fs.Timestamp.fromMillis(1),
      status: 'approved',
    })
    const list = await listingService.listAppointments('L1')
    expect(list.map((a) => [a.id, a.status])).toEqual([
      ['early', 'approved'],
      ['late', 'pending'],
    ])
  })

  it('subscribeAppointmentsForBuyer only sees that buyer', async () => {
    fs.__seed('marketplaceListings/L1/appointments/a', {
      buyerId: 'b1',
      scheduledAt: fs.Timestamp.fromMillis(NOW),
    })
    fs.__seed('marketplaceListings/L1/appointments/b', {
      buyerId: 'b2',
      scheduledAt: fs.Timestamp.fromMillis(NOW),
    })
    const seen: string[][] = []
    listingService.subscribeAppointmentsForBuyer('L1', 'b1', (list) =>
      seen.push(list.map((a) => a.id)),
    )
    listingService.subscribeAppointments('L1', (list) => seen.push(list.map((a) => a.id)))
    await Promise.resolve()
    expect(seen).toEqual([['a'], ['a', 'b']])
  })

  it('toAppointment falls back to "now" for missing timestamps', () => {
    expect(
      toAppointment('x', { listingId: 'L', buyerId: 'b', buyerName: 'n' } as never),
    ).toMatchObject({
      scheduledAt: NOW,
      createdAt: NOW,
      status: 'pending',
    })
  })
})

describe('favorites', () => {
  beforeEach(() => fs.__seed('marketplaceListings/L1', { favoriteCount: 0 }))

  it('add/remove are idempotent and keep favoriteCount in sync', async () => {
    await listingService.addFavorite('u1', 'L1')
    await listingService.addFavorite('u1', 'L1')
    expect(fs.__get('marketplaceListings/L1')!.favoriteCount).toBe(1)
    expect(await listingService.listFavoriteIds('u1')).toEqual(['L1'])
    await listingService.removeFavorite('u1', 'L1')
    await listingService.removeFavorite('u1', 'L1')
    expect(fs.__get('marketplaceListings/L1')!.favoriteCount).toBe(0)
    expect(await listingService.listFavoriteIds('u1')).toEqual([])
  })
})

describe('listingAppointmentLookupService', () => {
  function seedListing(id: string, extra: Record<string, unknown> = {}) {
    fs.__seed(`marketplaceListings/${id}`, {
      vehicleId: `veh-${id}`,
      vehicleSnapshot: snapshot,
      sellerId: 's1',
      verificationIds: [`ver-${id}`],
      ...extra,
    })
  }
  function seedAppt(listingId: string, id: string, buyerId: string, status: string, at: number) {
    fs.__seed(`marketplaceListings/${listingId}/appointments/${id}`, {
      listingId,
      buyerId,
      status,
      scheduledAt: fs.Timestamp.fromMillis(at),
      createdAt: fs.Timestamp.fromMillis(0),
    })
  }

  it('approved appointments within the 1-hour window (plus grace after) are returned with listing context', async () => {
    seedListing('L1')
    seedListing('L2')
    seedListing('L3')
    seedAppt('L1', 'soon', 'b1', 'approved', NOW + 50 * 60_000)
    seedAppt('L2', 'later', 'b1', 'approved', NOW + 2 * HOUR)
    seedAppt('L3', 'justPast', 'b1', 'approved', NOW - 10 * 60_000)
    seedAppt('L1', 'pending', 'b1', 'pending', NOW + 10 * 60_000)
    seedAppt('L1', 'other', 'b2', 'approved', NOW + 10 * 60_000)

    const noGrace = await listingAppointmentLookupService.listMyApprovedAppointmentsWithin(
      'b1',
      HOUR,
    )
    expect(noGrace.map((a) => a.appointment.id)).toEqual(['soon'])
    expect(noGrace[0]).toMatchObject({
      listingId: 'L1',
      vehicleId: 'veh-L1',
      sellerId: 's1',
      sellerVerificationId: 'ver-L1',
      vehicleSnapshot: snapshot,
    })

    const withGrace = await listingAppointmentLookupService.listMyApprovedAppointmentsWithin(
      'b1',
      HOUR,
      30 * 60_000,
    )
    expect(withGrace.map((a) => a.appointment.id).sort()).toEqual(['justPast', 'soon'])
  })

  it('bookable = pending + approved; deleted/unreadable listings are skipped, not fatal', async () => {
    seedListing('L1', { verificationIds: [] })
    seedListing('L2')
    seedAppt('L1', 'a', 'b1', 'pending', NOW)
    seedAppt('L2', 'b', 'b1', 'approved', NOW)
    seedAppt('Lgone', 'c', 'b1', 'approved', NOW)
    seedAppt('L1', 'd', 'b1', 'declined', NOW)
    fs.__failNext('getDoc') // first listing read is permission-denied
    const result = await listingAppointmentLookupService.listMyBookableAppointments('b1')
    expect(result).toHaveLength(1)
    const all =
      (fs.__reset(),
      seedListing('L1', { verificationIds: [] }),
      seedAppt('L1', 'a', 'b1', 'pending', NOW),
      await listingAppointmentLookupService.listMyBookableAppointments('b1'))
    expect(all[0].sellerVerificationId).toBeNull()
  })
})
