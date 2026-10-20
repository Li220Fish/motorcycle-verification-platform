import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('capacitor-voice-recorder', () => ({ VoiceRecorder: {} }))
vi.mock('@/services/media/audio-recorder.service', () => ({
  audioRecorderService: {
    checkPermission: vi.fn(async () => {}),
    start: vi.fn(async () => {}),
    stop: vi.fn(async () => ({ blob: new Blob(['a']), durationMs: 23000 })),
  },
}))
vi.mock('@/services/motion/motion-capture.service', () => ({
  motionCaptureService: { isSupported: () => false, start: vi.fn(), stop: vi.fn() },
  computeMotionSummary: () => ({ sampleCount: 0 }),
}))

import EngineInspectionFlow from '@/components/verification/engine/EngineInspectionFlow.vue'
import { PROBE_EVIDENCE_ITEM_ID } from '@/services/probe/probe-evidence'
import { probeService } from '@/services/probe/probe.service'
import { useProbeStore } from '@/stores/probe.store'
import { useVerificationStore } from '@/stores/verification.store'
import * as fs from '../fakes/firestore'
import * as fn from '../fakes/functions'

async function setup(opts: { useProbe: boolean; mode?: 'cold' | 'hot' }) {
  fs.__seed('verifications/v1', {
    vehicleId: 'veh1',
    userId: 'u1',
    type: opts.mode === 'hot' ? 'buyer' : 'seller',
    status: 'in_progress',
    createdAt: fs.Timestamp.fromMillis(1),
  })
  const verificationStore = useVerificationStore()
  await verificationStore.loadFlow('v1')
  await verificationStore.setVehicleType('scooter')

  const probeStore = useProbeStore()
  probeStore.setMode('mock')
  const connecting = probeStore.connect()
  await vi.advanceTimersByTimeAsync(300)
  await connecting
  probeStore.setChoice('v1', opts.useProbe)

  const wrapper = mount(EngineInspectionFlow, {
    props: { verificationId: 'v1', mode: opts.mode ?? 'cold' },
    global: { stubs: { teleport: true, EnginePlacementGuide: true, EngineWaveform: true } },
  })
  await flushPromises()
  return { wrapper, probeStore }
}

async function clickButton(wrapper: ReturnType<typeof mount>, label: string): Promise<void> {
  const button = wrapper.findAll('button').find((b) => b.text().includes(label))
  if (!button) throw new Error(`no button "${label}" in: ${wrapper.text()}`)
  await button.trigger('click')
  await flushPromises()
}

function probeEvidence(): Record<string, unknown>[] {
  return fs
    .__paths('verifications/v1/evidence/')
    .map((path) => fs.__get(path) as Record<string, unknown>)
    .filter((doc) => doc.itemId === PROBE_EVIDENCE_ITEM_ID)
    .sort((a, b) => (a.captureTimestamp as number) - (b.captureTimestamp as number))
}

describe('EngineInspectionFlow + Probe', () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    await probeService.disconnect()
    fn.__setCallable('analyzeEngineSensorSessionV2', () => ({}))
    fn.__setCallable('analyzeHotEngineSensorSessionV2', () => ({}))
  })
  afterEach(async () => {
    await probeService.disconnect()
    vi.useRealTimers()
  })

  it('cold: OCV+IR before recording, CRANK at t=0 then CHARGE, all saved as evidence', async () => {
    const { wrapper, probeStore } = await setup({ useProbe: true })
    await clickButton(wrapper, '我已放好')
    await vi.advanceTimersByTimeAsync(1300)
    expect(wrapper.text()).toContain('Probe 電瓶量測')

    await clickButton(wrapper, '開始引擎檢測')
    await vi.advanceTimersByTimeAsync(400) // OCV 150ms + IR 120ms
    await flushPromises()
    expect(wrapper.text()).toContain('等待發動壓降')

    await vi.advanceTimersByTimeAsync(23500)
    await flushPromises()

    expect(probeStore.log.filter((e) => e.direction === 'tx').map((e) => e.text)).toEqual([
      'OCV',
      'IR',
      'CRANK',
      'CHARGE',
    ])
    const saved = probeEvidence()
    expect(saved.map((d) => (d.metadata as { stage: string }).stage)).toEqual([
      'OCV',
      'IR',
      'CRANK',
      'CHARGE',
    ])
    expect(saved.every((d) => (d.metadata as { session: string }).session === 'cold')).toBe(true)
    expect(saved.every((d) => d.type === 'voltage' && d.captureSource === 'probe')).toBe(true)
    expect(wrapper.text()).toContain('電瓶量測完成')
    expect(wrapper.text()).toContain('完成引擎檢測')
  })

  it('hot (buyer 熱車): only CHARGE, during the recording', async () => {
    const { wrapper, probeStore } = await setup({ useProbe: true, mode: 'hot' })
    await clickButton(wrapper, '我已放好')
    await vi.advanceTimersByTimeAsync(1300)
    await clickButton(wrapper, '開始熱車檢查')
    await vi.advanceTimersByTimeAsync(18500)
    await flushPromises()
    expect(probeStore.log.filter((e) => e.direction === 'tx').map((e) => e.text)).toEqual([
      'CHARGE',
    ])
    expect(probeEvidence().map((d) => (d.metadata as { session: string }).session)).toEqual(['hot'])
  })

  it('declined → unchanged flow, nothing sent to the probe', async () => {
    const { wrapper, probeStore } = await setup({ useProbe: false })
    await clickButton(wrapper, '我已放好')
    await vi.advanceTimersByTimeAsync(1300)
    expect(wrapper.text()).not.toContain('Probe 電瓶量測')
    await clickButton(wrapper, '開始引擎檢測')
    await vi.advanceTimersByTimeAsync(23500)
    await flushPromises()
    expect(probeStore.log).toEqual([])
    expect(probeEvidence()).toEqual([])
  })

  it('opted in but disconnected → reconnect notice, recording still works without the probe', async () => {
    const { wrapper, probeStore } = await setup({ useProbe: true })
    await probeStore.disconnect()
    await clickButton(wrapper, '我已放好')
    await vi.advanceTimersByTimeAsync(1300)
    expect(wrapper.text()).toContain('重新連線 Probe')
    await clickButton(wrapper, '開始引擎檢測')
    await vi.advanceTimersByTimeAsync(23500)
    await flushPromises()
    expect(probeEvidence()).toEqual([])
    expect(wrapper.text()).toContain('完成引擎檢測')
  })

  it('cancel mid-recording resets the probe and keeps nothing from that attempt', async () => {
    const { wrapper, probeStore } = await setup({ useProbe: true })
    probeService.setMockAutoCrank(false)
    await clickButton(wrapper, '我已放好')
    await vi.advanceTimersByTimeAsync(1300)
    await clickButton(wrapper, '開始引擎檢測')
    await vi.advanceTimersByTimeAsync(400)
    await clickButton(wrapper, '取消')
    await clickButton(wrapper, '取消本次檢測')
    await vi.advanceTimersByTimeAsync(100)
    expect(probeStore.log.filter((e) => e.direction === 'tx').map((e) => e.text)).toEqual([
      'OCV',
      'IR',
      'CRANK',
      'RESET',
    ])
    expect(probeStore.runningStage).toBeNull()
    // OCV + IR were already saved before the cancel; CRANK never was.
    expect(probeEvidence().map((d) => (d.metadata as { stage: string }).stage)).toEqual([
      'OCV',
      'IR',
    ])
    probeService.setMockAutoCrank(true)
  })
})
