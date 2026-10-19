import { describe, expect, it, vi } from 'vitest'

// Native-only plugins some components import at module level.
vi.mock('@capacitor-community/bluetooth-le', () => ({ BleClient: {} }))
vi.mock('@capawesome/capacitor-torch', () => ({ Torch: {} }))
vi.mock('capacitor-voice-recorder', () => ({ VoiceRecorder: {} }))

/**
 * Every single-file component in the app compiles and imports cleanly — a
 * template syntax error, a broken import path or a module-level crash in any
 * view/component fails here, even for screens no behavior test mounts yet.
 */
const modules = import.meta.glob('/src/**/*.vue')
const paths = Object.keys(modules).sort()

describe('every .vue file compiles and imports', () => {
  it('found the whole app', () => {
    expect(paths.length).toBeGreaterThanOrEqual(150)
  })

  it.each(paths)(
    '%s',
    async (path) => {
      const mod = (await modules[path]()) as { default: Record<string, unknown> }
      expect(mod.default).toBeTruthy()
      expect(
        typeof mod.default.setup === 'function' || typeof mod.default.render === 'function',
      ).toBe(true)
    },
    30_000,
  )
})
