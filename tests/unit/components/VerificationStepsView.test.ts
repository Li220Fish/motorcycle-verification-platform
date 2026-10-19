import { flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useRoute: () => ({ query: {}, params: {} }),
  onBeforeRouteLeave: vi.fn(),
}))
vi.mock('@capacitor-community/bluetooth-le', () => ({ BleClient: {} }))
vi.mock('@capawesome/capacitor-torch', () => ({ Torch: {} }))
vi.mock('capacitor-voice-recorder', () => ({ VoiceRecorder: {} }))

import AiChatWidget from '@/components/verification/ai-chat/AiChatWidget.vue'
import BuyerVehicleModelGate from '@/components/verification/BuyerVehicleModelGate.vue'
import BuyerYearGate from '@/components/verification/BuyerYearGate.vue'
import VerificationHub from '@/components/verification/VerificationHub.vue'
import { tourService } from '@/services/verification/tour.service'
import { useVehicleStore } from '@/stores/vehicle.store'
import VerificationStepsView from '@/views/VerificationStepsView.vue'
import * as fs from '../fakes/firestore'

const NOW = new Date(2026, 9, 19, 12, 0).getTime()

function seed(extra: Record<string, unknown>) {
  fs.__seed('verifications/v1', {
    vehicleId: 'veh1',
    userId: 'u1',
    status: 'draft',
    createdAt: fs.Timestamp.fromMillis(NOW - 1000),
    ...extra,
  })
  useVehicleStore().currentVehicle = {
    id: 'veh1',
    transmission: '6速手排',
    manufactureYear: 2020,
    modelId: 'm1',
    brand: 'Y',
    model: 'M',
  } as never
}

async function render() {
  const wrapper = shallowMount(VerificationStepsView, {
    props: { id: 'v1' },
    global: { stubs: { teleport: true } },
  })
  await flushPromises()
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['Date', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
  })
  vi.setSystemTime(NOW)
  tourService.markTourSeen()
})
afterEach(() => vi.useRealTimers())

describe('VerificationStepsView — 5-minute attempt window', () => {
  it('seller: compact countdown that ticks down from 5:00', async () => {
    seed({ type: 'seller', attemptStartedAt: NOW })
    const wrapper = await render()
    expect(wrapper.findComponent(VerificationHub).exists()).toBe(true)
    const pill = () => wrapper.find('.attempt-countdown')
    expect(pill().exists()).toBe(true)
    expect(pill().classes()).toContain('on-hub')
    expect(pill().text()).toContain('5:00')
    await vi.advanceTimersByTimeAsync(61_000)
    expect(pill().text()).toContain('3:59')
  })

  it('seller: on expiry everything is wiped, status → draft, the clock restarts, and a notice is shown', async () => {
    seed({ type: 'seller', attemptStartedAt: NOW - 4 * 60_000 - 58_000 })
    fs.__seed('verifications/v1/answers/APR-rear', {
      itemId: 'APR-rear',
      result: 'normal',
      updatedAt: 1,
    })
    const wrapper = await render()
    expect(wrapper.find('.attempt-countdown').text()).toContain('0:02')
    await vi.advanceTimersByTimeAsync(3000)
    await flushPromises()
    expect(wrapper.find('.attempt-expired-overlay').exists()).toBe(true)
    expect(fs.__get('verifications/v1/answers/APR-rear')).toBeUndefined()
    expect(fs.__get('verifications/v1')!.status).toBe('draft')
    expect(fs.__get('verifications/v1')!.attemptStartedAt).toBeGreaterThanOrEqual(NOW + 2000)
    expect(wrapper.find('.attempt-countdown').text()).toMatch(/[45]:\d\d/)
  })

  it('buyer: no time limit, even with a legacy attemptStartedAt', async () => {
    seed({
      type: 'buyer',
      attemptStartedAt: NOW - 10 * 60_000,
      vehicleSnapshot: { brand: 'Y', model: 'M', manufactureYear: 2020, modelId: 'm1' },
    })
    const wrapper = await render()
    expect(wrapper.find('.attempt-countdown').exists()).toBe(false)
    await vi.advanceTimersByTimeAsync(10 * 60_000)
    expect(wrapper.find('.attempt-expired-overlay').exists()).toBe(false)
  })

  it('completed verifications never show the countdown', async () => {
    seed({ type: 'seller', attemptStartedAt: NOW, status: 'completed' })
    const wrapper = await render()
    expect(wrapper.find('.attempt-countdown').exists()).toBe(false)
  })
})

describe('VerificationStepsView — buyer gates', () => {
  it('model gate first when the snapshot has no modelId, then the year gate, then the hub', async () => {
    seed({
      type: 'buyer',
      vehicleSnapshot: { brand: 'YAMAHA', model: 'MT-03', manufactureYear: null, modelId: null },
    })
    const wrapper = await render()
    const modelGate = wrapper.findComponent(BuyerVehicleModelGate)
    expect(modelGate.exists()).toBe(true)
    expect(modelGate.props()).toMatchObject({ knownBrand: 'YAMAHA', knownModel: 'MT-03' })

    modelGate.vm.$emit('confirm', null)
    await flushPromises()
    expect(fs.__get('verifications/v1')!.buyerModelConfirmed).toBe(true)
    const yearGate = wrapper.findComponent(BuyerYearGate)
    expect(yearGate.exists()).toBe(true)

    yearGate.vm.$emit('confirm', 2019)
    await flushPromises()
    expect(
      (fs.__get('verifications/v1')!.vehicleSnapshot as { manufactureYear: number })
        .manufactureYear,
    ).toBe(2019)
    expect(wrapper.findComponent(VerificationHub).exists()).toBe(true)
  })

  it('a model picked in the gate is saved and its known issues are snapshotted', async () => {
    fs.__seed('vehicleModels/m9', {
      brand: 'YAMAHA',
      knownIssues: [{ id: 'k', part: 'rear', description: '尾燈易進水' }],
    })
    seed({
      type: 'buyer',
      vehicleSnapshot: { brand: 'YAMAHA', model: 'MT-03', manufactureYear: 2021, modelId: null },
    })
    const wrapper = await render()
    wrapper.findComponent(BuyerVehicleModelGate).vm.$emit('confirm', 'm9')
    await flushPromises()
    const saved = fs.__get('verifications/v1')!
    expect((saved.vehicleSnapshot as { modelId: string }).modelId).toBe('m9')
    expect(saved.buyerKnownIssuesSnapshot).toEqual([
      { id: 'k', part: 'rear', description: '尾燈易進水' },
    ])
  })

  it('once confirmed, the model gate is never shown again', async () => {
    seed({
      type: 'buyer',
      buyerModelConfirmed: true,
      vehicleSnapshot: { brand: 'Y', model: 'M', manufactureYear: 2021, modelId: null },
    })
    const wrapper = await render()
    expect(wrapper.findComponent(BuyerVehicleModelGate).exists()).toBe(false)
    expect(wrapper.findComponent(BuyerYearGate).exists()).toBe(false)
    expect(wrapper.findComponent(VerificationHub).exists()).toBe(true)
  })

  it('sellers get no AI chat button (buyer-only)', async () => {
    seed({ type: 'seller', attemptStartedAt: NOW })
    const wrapper = await render()
    expect(wrapper.findComponent(AiChatWidget).exists()).toBe(false)
  })

  it('sellers never see the buyer gates', async () => {
    seed({ type: 'seller', attemptStartedAt: NOW })
    useVehicleStore().currentVehicle = {
      id: 'veh1',
      transmission: '6速手排',
      manufactureYear: null,
      modelId: null,
    } as never
    const wrapper = await render()
    expect(wrapper.findComponent(BuyerVehicleModelGate).exists()).toBe(false)
    expect(wrapper.findComponent(BuyerYearGate).exists()).toBe(false)
  })
})
