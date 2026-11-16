import { describe, expect, it } from 'vitest'

import { instructionAt, normalizeSamples, pickMimeType } from '../src/core/session'

describe('session timeline', () => {
  it('cues the rev phase at 9 s like RiDE’s hot check', () => {
    expect(instructionAt(0)).toContain('怠速')
    expect(instructionAt(8000)).toContain('準備')
    expect(instructionAt(9500)).toContain('催油門')
  })

  it('rebases motion samples and drops ones outside the 18 s window', () => {
    const start = 1_000_000
    const raw = [-50, 0, 10, 17_990, 18_000, 20_000].map((offset) => ({
      t: start + offset,
      ax: 0,
      ay: 0,
      az: 9.8,
      gx: 0,
      gy: 0,
      gz: 0,
    }))
    const { samples } = normalizeSamples(raw, start)
    expect(samples.map((s) => s.tMs)).toEqual([0, 10, 17_990])
  })

  it('prefers opus webm, falls back to mp4 (iOS)', () => {
    expect(pickMimeType(() => true)).toBe('audio/webm;codecs=opus')
    expect(pickMimeType((type) => type === 'audio/mp4')).toBe('audio/mp4')
    expect(pickMimeType(() => false)).toBe('')
  })
})
