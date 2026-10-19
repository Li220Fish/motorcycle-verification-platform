import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const nav = vi.hoisted(() => ({ push: vi.fn(), query: {} as Record<string, string> }))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: nav.push, back: vi.fn() }),
  useRoute: () => ({ query: nav.query }),
}))
vi.mock('@/services/firebase/push-notification.service', () => ({
  pushNotificationService: { initialize: vi.fn() },
}))

import VerificationView from '@/views/VerificationView.vue'
import { useAuthStore } from '@/stores/auth.store'
import * as fs from '../fakes/firestore'

const NOW = new Date(2026, 9, 19, 12, 0).getTime()
const MIN = 60_000

function signIn() {
  useAuthStore().user = {
    id: 'b1',
    email: 'buyer@x.com',
    displayName: 'B',
    photoUrl: null,
    createdAt: 0,
    updatedAt: 0,
    isAnonymous: false,
    emailVerified: true,
    providerIds: ['password'],
  }
}
function seedListing(id: string, brand: string, model: string) {
  fs.__seed(`marketplaceListings/${id}`, {
    vehicleId: `veh-${id}`,
    sellerId: 's1',
    verificationIds: [`sv-${id}`],
    vehicleSnapshot: {
      brand,
      model,
      manufactureYear: 2021,
      transmission: '6速手排',
      modelId: null,
    },
  })
}
function seedAppointment(listingId: string, id: string, status: string, at: number) {
  fs.__seed(`marketplaceListings/${listingId}/appointments/${id}`, {
    listingId,
    buyerId: 'b1',
    buyerName: 'B',
    status,
    scheduledAt: fs.Timestamp.fromMillis(at),
    createdAt: fs.Timestamp.fromMillis(0),
  })
}

async function render(query: Record<string, string> = { type: 'buyer' }) {
  nav.query = query
  const wrapper = mount(VerificationView)
  await flushPromises()
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  nav.push.mockReset()
  signIn()
})
afterEach(() => vi.useRealTimers())

describe('VerificationView — appointment reminder (1 hour before)', () => {
  it('an approved appointment within the next hour shows as a blue-bordered draft row', async () => {
    seedListing('L1', 'YAMAHA', 'MT-03')
    seedAppointment('L1', 'a1', 'approved', NOW + 50 * MIN)
    const wrapper = await render()
    const rows = wrapper.findAll('.upcoming-appointment-row')
    expect(rows).toHaveLength(1)
    expect(rows[0].text()).toContain('YAMAHA MT-03')
    expect(rows[0].text()).toContain('草稿')
  })

  it('more than an hour away, pending, or long past → not shown', async () => {
    seedListing('L1', 'YAMAHA', 'MT-03')
    seedListing('L2', 'SYM', 'JET')
    seedListing('L3', 'KYMCO', 'KRV')
    seedAppointment('L1', 'far', 'approved', NOW + 61 * MIN)
    seedAppointment('L2', 'pend', 'pending', NOW + 10 * MIN)
    seedAppointment('L3', 'old', 'approved', NOW - 3 * 60 * MIN)
    const wrapper = await render()
    expect(wrapper.findAll('.upcoming-appointment-row')).toHaveLength(0)
  })

  it('still shown shortly after the agreed time (buyer is on site)', async () => {
    seedListing('L1', 'YAMAHA', 'MT-03')
    seedAppointment('L1', 'a1', 'approved', NOW - 90 * MIN)
    const wrapper = await render()
    expect(wrapper.findAll('.upcoming-appointment-row')).toHaveLength(1)
  })

  it('an existing unfinished buyer verification for that car is highlighted instead of duplicated', async () => {
    seedListing('L1', 'YAMAHA', 'MT-03')
    seedAppointment('L1', 'a1', 'approved', NOW + 30 * MIN)
    fs.__seed('verifications/bv1', {
      vehicleId: 'veh-L1',
      userId: 'b1',
      type: 'buyer',
      status: 'in_progress',
      createdAt: fs.Timestamp.fromMillis(NOW - MIN),
      vehicleSnapshot: { brand: 'YAMAHA', model: 'MT-03' },
    })
    const wrapper = await render()
    const rows = wrapper.findAll('.upcoming-appointment-row')
    expect(rows).toHaveLength(1)
    expect(rows[0].text()).toContain('進行中')
    expect(wrapper.findAll('.recent-row')).toHaveLength(1)
  })

  it('tapping the reminder row creates a buyer verification carrying listing + seller ids, no time limit', async () => {
    seedListing('L1', 'YAMAHA', 'MT-03')
    seedAppointment('L1', 'a1', 'approved', NOW + 30 * MIN)
    const wrapper = await render()
    await wrapper.find('.upcoming-appointment-row').trigger('click')
    await flushPromises()
    const id = nav.push.mock.calls[0][0].replace('/verification/', '')
    expect(fs.__get(`verifications/${id}`)).toMatchObject({
      type: 'buyer',
      userId: 'b1',
      vehicleId: 'veh-L1',
      listingId: 'L1',
      relatedVerificationId: 'sv-L1',
      status: 'draft',
      vehicleSnapshot: { brand: 'YAMAHA', model: 'MT-03', manufactureYear: 2021 },
    })
    expect(fs.__get(`verifications/${id}`)!.attemptStartedAt).toBeUndefined()
  })
})

describe('VerificationView — buyer starting from an appointment', () => {
  it('dropdown lists bookable appointments and starts the chosen one', async () => {
    seedListing('L1', 'YAMAHA', 'MT-03')
    seedAppointment('L1', 'a1', 'pending', NOW + 3 * 24 * 60 * MIN)
    const wrapper = await render()
    const select = wrapper.find('select.appointment-select')
    expect(select.findAll('option').map((o) => o.text())[1]).toContain('YAMAHA MT-03')
    await select.setValue('L1')
    await wrapper
      .findAll('button')
      .find((b) => b.text() === '開始')!
      .trigger('click')
    await flushPromises()
    expect(nav.push).toHaveBeenCalledWith(expect.stringMatching(/^\/verification\//))
  })

  it('an unfinished buyer verification for the same car asks resume / restart / cancel', async () => {
    seedListing('L1', 'YAMAHA', 'MT-03')
    seedAppointment('L1', 'a1', 'approved', NOW + 20 * MIN)
    fs.__seed('verifications/old', {
      vehicleId: 'veh-L1',
      userId: 'b1',
      type: 'buyer',
      status: 'draft',
      createdAt: fs.Timestamp.fromMillis(1),
      vehicleSnapshot: { brand: 'YAMAHA', model: 'MT-03' },
    })
    const wrapper = await render()

    // resume
    await wrapper.find('select.appointment-select').setValue('L1')
    const start = () => wrapper.findAll('button').find((b) => b.text() === '開始')!
    await start().trigger('click')
    await flushPromises()
    expect(wrapper.find('.resume-card').exists()).toBe(true)
    await wrapper.find('.resume-card button').trigger('click')
    await flushPromises()
    expect(nav.push).toHaveBeenLastCalledWith('/verification/old')

    // cancel
    nav.push.mockReset()
    await start().trigger('click')
    await flushPromises()
    await wrapper.find('.resume-cancel').trigger('click')
    await flushPromises()
    expect(nav.push).not.toHaveBeenCalled()
    expect(wrapper.find('.error').exists()).toBe(false)

    // restart → old draft deleted, new one created
    await start().trigger('click')
    await flushPromises()
    await wrapper.findAll('.resume-card button')[1].trigger('click')
    await flushPromises()
    expect(fs.__get('verifications/old')).toBeUndefined()
    const newId = nav.push.mock.calls.at(-1)![0].replace('/verification/', '')
    expect(newId).not.toBe('old')
  })

  it('with no appointments the buyer can still name a verification', async () => {
    const wrapper = await render()
    expect(wrapper.find('select.appointment-select').exists()).toBe(false)
    const input = wrapper.find('input[type="text"]')
    expect(input.exists()).toBe(true)
    const startBtn = wrapper.findAll('button').find((b) => b.text() === '開始')!
    expect(startBtn.attributes('disabled')).toBeDefined()
    await input.setValue('朋友的車')
    await startBtn.trigger('click')
    await flushPromises()
    const id = nav.push.mock.calls[0][0].replace('/verification/', '')
    expect(fs.__get(`verifications/${id}`)).toMatchObject({ type: 'buyer', userId: 'b1' })
  })
})

describe('VerificationView — unfinished list', () => {
  it('shows only unfinished, newest first, labelled from vehicleSnapshot', async () => {
    fs.__seed('verifications/a', {
      vehicleId: 'x',
      userId: 'b1',
      type: 'buyer',
      status: 'draft',
      createdAt: fs.Timestamp.fromMillis(1),
      vehicleSnapshot: { brand: 'HONDA', model: 'CB' },
    })
    fs.__seed('verifications/b', {
      vehicleId: 'y',
      userId: 'b1',
      type: 'seller',
      status: 'completed',
      createdAt: fs.Timestamp.fromMillis(2),
    })
    const wrapper = await render({})
    const rows = wrapper.findAll('.recent-row')
    expect(rows).toHaveLength(1)
    expect(rows[0].text()).toContain('HONDA CB')
    await rows[0].trigger('click')
    expect(nav.push).toHaveBeenCalledWith('/verification/a')
  })

  it('type picker appears without a preset type', async () => {
    const wrapper = await render({})
    expect(wrapper.findAll('.type-card')).toHaveLength(2)
    await wrapper.findAll('.type-card')[0].trigger('click')
    expect(wrapper.find('.type-card').exists()).toBe(false)
  })
})
