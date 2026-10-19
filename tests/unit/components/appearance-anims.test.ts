import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ANIMS as RAW_ANIMS,
  mountAppearanceAnim,
} from '@/components/verification/buyer-appearance/appearance-anims'
import { BUYER_APPEARANCE_ITEM_DEFS } from '@/data/verification/buyer-appearance-items'

interface AnimApi {
  T: number
  frame(t: number): void
  still(): void
}
// The ported module is untyped (@ts-nocheck) — describe just what the test uses.
const ANIMS = RAW_ANIMS as unknown as Record<
  string,
  { factory(host: HTMLElement, uid: string): AnimApi }
>

/** Runs the real ported animation code (SVG built via innerHTML + factory
 *  driving it frame by frame) for every item, end to end. */
beforeEach(() => {
  // happy-dom has no SVG geometry; the clamp animation measures one path.
  ;(SVGElement.prototype as unknown as { getTotalLength: () => number }).getTotalLength = () => 100
})
afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('appearance animations', () => {
  it('every checklist item has an animation', () => {
    for (const def of BUYER_APPEARANCE_ITEM_DEFS) expect(ANIMS[def.key], def.key).toBeDefined()
  })

  it.each(BUYER_APPEARANCE_ITEM_DEFS.map((d) => d.key))(
    '%s: mounts with real image URLs, renders every frame of a full loop, and the still frame',
    (key) => {
      const host = document.createElement('div')
      document.body.appendChild(host)
      const instance = mountAppearanceAnim(host, key, 'meet')
      expect(host.innerHTML).not.toContain('__IMG_')
      expect(host.innerHTML).not.toContain('__UID__')
      expect(host.querySelectorAll('image').length).toBeGreaterThan(0)

      // Drive the factory directly through one full cycle.
      const api = ANIMS[key].factory(
        host,
        host.querySelector('[id]')!.id.replace(/^.*?(_\d+)$/, '$1'),
      )
      for (let t = 0; t < api.T; t += 0.25) api.frame(t)
      api.still()

      instance.still()
      instance.stop()
      expect(host.innerHTML).toBe('')
    },
  )

  it('loop reports progress through a full cycle', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
    const host = document.body.appendChild(document.createElement('div'))
    const instance = mountAppearanceAnim(host, 'steer', 'meet')
    let last = 0
    instance.loop((elapsed: number) => (last = elapsed))
    vi.advanceTimersByTime(12_000)
    expect(last).toBeGreaterThan(11.2) // one 11.2s steer cycle completed
    instance.stop()
  })

  it('playOnce stops on the still frame and calls back', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
    const host = document.body.appendChild(document.createElement('div'))
    const instance = mountAppearanceAnim(host, 'fork', 'fill')
    const done = vi.fn()
    instance.playOnce(done)
    vi.advanceTimersByTime(5000)
    expect(done).toHaveBeenCalledTimes(1)
    instance.stop()
  })
})
