import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useRoute: () => ({ query: {}, params: {} }),
  onBeforeRouteLeave: vi.fn(),
}))
vi.mock('@capacitor-community/bluetooth-le', () => ({ BleClient: {} }))
vi.mock('@capawesome/capacitor-torch', () => ({ Torch: {} }))
vi.mock('capacitor-voice-recorder', () => ({ VoiceRecorder: {} }))

import BuyerAppearanceCheck from '@/components/verification/buyer-appearance/BuyerAppearanceCheck.vue'
import AiChatWidget from '@/components/verification/ai-chat/AiChatWidget.vue'
import VerificationCategoryNav from '@/components/verification/VerificationCategoryNav.vue'
import RideSafetyGate from '@/components/verification/RideSafetyGate.vue'
import VerificationHub from '@/components/verification/VerificationHub.vue'
import VerificationItem from '@/components/verification/VerificationItem.vue'
import ColdTouchCapture from '@/components/verification/environment/ColdTouchCapture.vue'
import EngineInspectionFlow from '@/components/verification/engine/EngineInspectionFlow.vue'
import { useAiChatStore } from '@/stores/ai-chat.store'
import { tourService } from '@/services/verification/tour.service'
import { useVehicleStore } from '@/stores/vehicle.store'
import VerificationStepsView from '@/views/VerificationStepsView.vue'
import * as fs from '../fakes/firestore'

const COLD_SECTION_EVIDENCE: Record<string, string> = {
  'ENG-02': 'video',
  'ENG-03': 'audio',
  'ENG-04': 'audio',
  'ENG-05': 'audio',
  'ENG-06': 'audio',
  'ENG-07': 'imu',
  'ENG-08': 'imu',
}

/** 買家複驗：還沒做冷車就想進熱車檢查／上路時，流程會怎麼走。 */
async function renderBuyer(opts: { coldDone?: boolean } = {}) {
  fs.__seed('verifications/v1', {
    vehicleId: 'veh1',
    userId: 'b1',
    type: 'buyer',
    status: 'in_progress',
    createdAt: fs.Timestamp.fromMillis(1),
    buyerModelConfirmed: true,
    vehicleSnapshot: { brand: 'Y', model: 'M', manufactureYear: 2021, modelId: 'm1' },
    ...(opts.coldDone ? { analysisStatus: { coldCheck: { status: 'completed' } } } : {}),
  })
  if (opts.coldDone) {
    for (const [id, type] of Object.entries(COLD_SECTION_EVIDENCE)) {
      fs.__seed(`verifications/v1/answers/${id}`, { itemId: id, result: 'normal', updatedAt: 1 })
      fs.__seed(`verifications/v1/evidence/ev-${id}`, {
        id: `ev-${id}`,
        verificationId: 'v1',
        itemId: id,
        type,
        createdAt: 1,
        remoteUrl: 'x',
      })
    }
  }
  useVehicleStore().currentVehicle = { id: 'veh1', transmission: '6速手排' } as never
  const wrapper = shallowMount(VerificationStepsView, {
    props: { id: 'v1' },
    global: {
      stubs: {
        teleport: true,
        // Render the layout's slot so the actual step screen inside is visible.
        VerificationLayout: { template: '<div class="layout"><slot name="nav" /><slot /></div>' },
      },
    },
  })
  await flushPromises()
  await flushPromises()
  return wrapper
}

function where(wrapper: Awaited<ReturnType<typeof renderBuyer>>): string {
  if (wrapper.findComponent(VerificationHub).exists()) return 'hub'
  if (wrapper.findComponent(ColdTouchCapture).exists()) return 'cold-touch(ENG-02)'
  if (wrapper.findComponent(RideSafetyGate).exists()) return 'ride-safety-gate'
  if (wrapper.findComponent(BuyerAppearanceCheck).exists()) return 'appearance-check'
  const engine = wrapper.findComponent(EngineInspectionFlow)
  if (engine.exists()) return `engine-flow(${engine.props('mode')})`
  const item = wrapper.findComponent(VerificationItem)
  if (item.exists()) return `item(${item.props('item').id})`
  return 'other'
}

async function enter(section: string, opts: { coldDone?: boolean } = {}) {
  const wrapper = await renderBuyer(opts)
  wrapper.findComponent(VerificationHub).vm.$emit('selectSection', section)
  await flushPromises()
  return wrapper
}

beforeEach(() => tourService.markTourSeen())

describe('buyer: cold check before hot check', () => {
  it('熱車檢查 without the cold check jumps to 冷車狀態確認 (ENG-02) and explains why', async () => {
    const wrapper = await enter('buyer-hot-check')
    expect(where(wrapper)).toBe('cold-touch(ENG-02)')
    const notice = wrapper.find('.cold-first-overlay')
    expect(notice.exists()).toBe(true)
    expect(notice.text()).toContain('請先完成冷車檢查')
    expect(notice.text()).toContain('熱車檢查必須在「冷車＋引擎檢查」完成後才能進行')
  })

  it('the notice closes with its button and the buyer stays on the cold check', async () => {
    const wrapper = await enter('buyer-hot-check')
    await wrapper.find('.cold-first-overlay primary-button-stub').trigger('click')
    expect(wrapper.find('.cold-first-overlay').exists()).toBe(false)
    expect(where(wrapper)).toBe('cold-touch(ENG-02)')
  })

  it('車輛外觀檢測 opens the animated appearance check, no notice', async () => {
    const appearance = await enter('buyer-appearance')
    expect(where(appearance)).toBe('appearance-check')
    expect(appearance.find('.cold-first-overlay').exists()).toBe(false)
  })

  it('no notice when entering the cold section itself', async () => {
    const cold = await enter('seller-phase3-engine')
    expect(where(cold)).toBe('cold-touch(ENG-02)')
    expect(cold.find('.cold-first-overlay').exists()).toBe(false)
  })

  it('after the appearance check, entering 熱車檢查 still goes back to the cold check, with the notice', async () => {
    fs.__seed('verifications/v1/answers/BUYER-APP-steer', {
      itemId: 'BUYER-APP-steer',
      result: 'normal',
      updatedAt: 1,
    })
    const wrapper = await enter('buyer-hot-check')
    expect(where(wrapper)).toBe('cold-touch(ENG-02)')
    expect(wrapper.find('.cold-first-overlay').exists()).toBe(true)
  })

  it('once the cold check is done the hot check opens normally, no notice', async () => {
    const wrapper = await enter('buyer-hot-check', { coldDone: true })
    expect(wrapper.find('.cold-first-overlay').exists()).toBe(false)
    expect(where(wrapper)).toBe('item(HOT-01)')
  })

  it('finishing 冷車＋引擎 goes straight into 熱車檢查 (no disclosure / road-test screens)', async () => {
    const wrapper = await renderBuyer({ coldDone: true })
    wrapper.findComponent(VerificationHub).vm.$emit('selectSection', 'seller-phase3-engine')
    await flushPromises()
    wrapper.findComponent(VerificationCategoryNav).vm.$emit('selectItem', 'ENG-05')
    await flushPromises()
    expect(where(wrapper)).toBe('engine-flow(cold)')
    wrapper.findComponent(EngineInspectionFlow).vm.$emit('advance')
    await flushPromises()
    expect(where(wrapper)).toBe('item(HOT-01)')
  })

  it('「問 AI」 button: not on the hub nor in the animated appearance check', async () => {
    const wrapper = await renderBuyer()
    const widget = () => wrapper.findComponent(AiChatWidget)
    expect(widget().props()).toMatchObject({ showFab: false, hidden: false })
    wrapper.findComponent(VerificationHub).vm.$emit('selectSection', 'buyer-appearance')
    await flushPromises()
    expect(where(wrapper)).toBe('appearance-check')
    expect(widget().props('showFab')).toBe(false)
  })

  it('「問 AI」 button appears in the 12-point check', async () => {
    const wrapper = await renderBuyer()
    wrapper.findComponent(VerificationHub).vm.$emit('selectSection', 'buyer-appearance')
    await flushPromises()
    wrapper.findComponent(VerificationCategoryNav).vm.$emit('selectItem', 'BASIC-headlight')
    await flushPromises()
    expect(wrapper.findComponent(AiChatWidget).props()).toMatchObject({
      showFab: true,
      hidden: false,
    })
  })

  it('「問 AI」 button is available in 冷車', async () => {
    const cold = await enter('seller-phase3-engine')
    expect(cold.findComponent(AiChatWidget).props()).toMatchObject({
      showFab: true,
      hidden: false,
    })
  })

  it('「問 AI」 button is available in 熱車', async () => {
    const hot = await enter('buyer-hot-check', { coldDone: true })
    expect(where(hot)).toBe('item(HOT-01)')
    expect(hot.findComponent(AiChatWidget).props()).toMatchObject({
      showFab: true,
      hidden: false,
    })
  })

  it('…but steps aside while a recording is running', async () => {
    const wrapper = await renderBuyer({ coldDone: true })
    wrapper.findComponent(VerificationHub).vm.$emit('selectSection', 'seller-phase3-engine')
    await flushPromises()
    wrapper.findComponent(VerificationCategoryNav).vm.$emit('selectItem', 'ENG-05')
    await flushPromises()
    wrapper.findComponent(EngineInspectionFlow).vm.$emit('recording-active', true)
    await flushPromises()
    expect(wrapper.findComponent(AiChatWidget).props('hidden')).toBe(true)
    wrapper.findComponent(EngineInspectionFlow).vm.$emit('recording-active', false)
    await flushPromises()
    expect(wrapper.findComponent(AiChatWidget).props('hidden')).toBe(false)
  })

  it('leaving the verification clears the AI conversation', async () => {
    const wrapper = await renderBuyer()
    const chat = useAiChatStore()
    chat.messages.push({ id: 1, role: 'user', text: 'x' })
    chat.open = true
    wrapper.unmount()
    expect(chat.messages).toEqual([])
    expect(chat.open).toBe(false)
  })
})
