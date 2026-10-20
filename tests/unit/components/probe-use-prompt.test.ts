import { flushPromises, mount, shallowMount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useRoute: () => ({ query: {}, params: {} }),
  onBeforeRouteLeave: vi.fn(),
}))
vi.mock('@capawesome/capacitor-torch', () => ({ Torch: {} }))
vi.mock('capacitor-voice-recorder', () => ({ VoiceRecorder: {} }))

import InspectionReportBody from '@/components/verification/InspectionReportBody.vue'
import ProbeUsePrompt from '@/components/probe/ProbeUsePrompt.vue'
import { probeService } from '@/services/probe/probe.service'
import { tourService } from '@/services/verification/tour.service'
import { useProbeStore } from '@/stores/probe.store'
import { useVehicleStore } from '@/stores/vehicle.store'
import VerificationStepsView from '@/views/VerificationStepsView.vue'
import * as fs from '../fakes/firestore'

async function render(type: 'seller' | 'buyer', connectProbe: boolean) {
  vi.spyOn(tourService, 'hasSeenTour').mockReturnValue(true)
  fs.__seed('verifications/v1', {
    vehicleId: 'veh1',
    userId: 'u1',
    type,
    status: 'in_progress',
    createdAt: fs.Timestamp.fromMillis(1),
    buyerModelConfirmed: true,
    vehicleSnapshot: {
      brand: 'Y',
      model: 'M',
      manufactureYear: 2021,
      modelId: 'm1',
      transmission: '手排',
    },
  })
  useVehicleStore().currentVehicle = {
    id: 'veh1',
    transmission: '6速手排',
    manufactureYear: 2021,
  } as never
  const probeStore = useProbeStore()
  probeStore.setMode('mock')
  if (connectProbe) {
    const connecting = probeStore.connect()
    await vi.advanceTimersByTimeAsync(300)
    await connecting
  }
  const wrapper = shallowMount(VerificationStepsView, {
    props: { id: 'v1' },
    global: { stubs: { teleport: true } },
  })
  await flushPromises()
  await flushPromises()
  return { wrapper, probeStore }
}

describe('「要使用 Probe 嗎？」prompt', () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    await probeService.disconnect()
  })
  afterEach(async () => {
    await probeService.disconnect()
    vi.useRealTimers()
  })

  it.each(['seller', 'buyer'] as const)(
    '%s: asked once while a probe is connected',
    async (type) => {
      const { wrapper, probeStore } = await render(type, true)
      const prompt = wrapper.findComponent(ProbeUsePrompt)
      expect(prompt.exists()).toBe(true)
      prompt.vm.$emit('choose', true)
      await flushPromises()
      expect(probeStore.choiceFor('v1')).toBe(true)
      expect(wrapper.findComponent(ProbeUsePrompt).exists()).toBe(false)
    },
  )

  it('never shown without a connected probe', async () => {
    const { wrapper } = await render('seller', false)
    expect(wrapper.findComponent(ProbeUsePrompt).exists()).toBe(false)
  })

  it('not asked again once answered (even "no")', async () => {
    localStorage.setItem('motoverify:probeUse:v1', 'no')
    const { wrapper } = await render('buyer', true)
    expect(wrapper.findComponent(ProbeUsePrompt).exists()).toBe(false)
  })

  it('prompt buttons emit the choice', async () => {
    const prompt = mount(ProbeUsePrompt, {
      props: { deviceName: 'MotoBattery_Probe' },
      global: { stubs: { teleport: true } },
    })
    expect(prompt.text()).toContain('MotoBattery_Probe')
    await prompt.find('[data-testid="probe-prompt-no"]').trigger('click')
    await prompt.find('[data-testid="probe-prompt-yes"]').trigger('click')
    expect(prompt.emitted('choose')).toEqual([[false], [true]])
  })
})

describe('report: Probe 電瓶檢測 section', () => {
  const reading = (stage: 'OCV' | 'CHARGE', session: 'cold' | 'hot', value: number) => ({
    stage,
    session,
    status: 'OK' as const,
    grade: 'GOOD' as const,
    judgment: '正常',
    primaryValue: value,
    values: {},
    deviceName: 'MotoBattery_Probe',
    probeMode: 'ble' as const,
    firmware: {},
  })
  const body = (probeReadings: ReturnType<typeof reading>[]) =>
    mount(InspectionReportBody, {
      props: { vehicleTitle: 'Y M', inspectedDate: '2026/10/20', sections: [], probeReadings },
      global: { stubs: { VehicleDiagramOverview: true } },
    })

  it('lists each reading with its session tag', () => {
    const wrapper = body([reading('OCV', 'cold', 12.74), reading('CHARGE', 'hot', 14.21)])
    expect(wrapper.text()).toContain('Probe 電瓶檢測')
    expect(wrapper.text()).toContain('冷車靜態電壓')
    expect(wrapper.text()).toContain('12.74 V')
    expect(wrapper.text()).toContain('熱車回充檢驗')
    expect(wrapper.text()).toContain('14.21 V')
  })

  it('hidden when the inspection did not use the probe', () => {
    expect(body([]).text()).not.toContain('Probe 電瓶檢測')
  })
})
