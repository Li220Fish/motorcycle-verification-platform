import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import EngineWaveform from '@/components/verification/engine/EngineWaveform.vue'

const heights = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll('.bar').map((bar) => parseFloat((bar.element as HTMLElement).style.height))

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('EngineWaveform', () => {
  it('keeps moving with a constant sensor reading (the old version froze on the first frame)', async () => {
    const wrapper = mount(EngineWaveform, { props: { active: true, magnitude: 0.01 } })
    const first = heights(wrapper)
    await vi.advanceTimersByTimeAsync(1000)
    const later = heights(wrapper)
    expect(later).not.toEqual(first)
    // a tiny idle vibration is auto-scaled into a clearly visible bar
    expect(Math.max(...later.slice(-5))).toBeGreaterThan(50)
  })

  it('follows the real reading: a spike stands out from steady idle vibration', async () => {
    const wrapper = mount(EngineWaveform, { props: { active: true, magnitude: 0.05 } })
    await vi.advanceTimersByTimeAsync(2000)
    await wrapper.setProps({ magnitude: 0.5 })
    await vi.advanceTimersByTimeAsync(100)
    const spike = heights(wrapper).at(-1)!
    await wrapper.setProps({ magnitude: 0.05 })
    await vi.advanceTimersByTimeAsync(100)
    const afterSpike = heights(wrapper).at(-1)!
    expect(spike).toBeGreaterThan(80)
    expect(afterSpike).toBeLessThan(spike / 2)
  })

  it('audio-only (no sensor): decorative pulse keeps moving and never flattens to the floor', async () => {
    const wrapper = mount(EngineWaveform, { props: { active: true } })
    await vi.advanceTimersByTimeAsync(10_000)
    const bars = heights(wrapper)
    expect(new Set(bars).size).toBeGreaterThan(10)
    expect(bars.filter((h) => h <= 6).length).toBeLessThan(bars.length / 2)
  })

  it('stops when inactive', async () => {
    const wrapper = mount(EngineWaveform, { props: { active: true } })
    await vi.advanceTimersByTimeAsync(500)
    await wrapper.setProps({ active: false })
    const frozen = heights(wrapper)
    await vi.advanceTimersByTimeAsync(1000)
    expect(heights(wrapper)).toEqual(frozen)
  })
})
