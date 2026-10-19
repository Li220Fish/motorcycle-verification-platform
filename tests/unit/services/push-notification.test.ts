import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  native: { value: true },
  listeners: {} as Record<string, (arg: unknown) => void>,
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  register: vi.fn(),
  push: vi.fn(),
}))

vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    addListener: (event: string, cb: (arg: unknown) => void) => {
      m.listeners[event] = cb
    },
    checkPermissions: m.checkPermissions,
    requestPermissions: m.requestPermissions,
    register: m.register,
  },
}))
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => m.native.value,
    getPlatform: () => (m.native.value ? 'android' : 'web'),
  },
}))
vi.mock('@/router', () => ({ default: { push: m.push } }))

type PushModule = typeof import('@/services/firebase/push-notification.service')
let service: PushModule['pushNotificationService']
let fs: typeof import('../fakes/firestore')

beforeEach(async () => {
  // Fresh module graph so the "listeners wired once" flag starts clean — the
  // fake Firestore is re-instantiated with it, so grab that same instance.
  vi.resetModules()
  m.native.value = true
  m.listeners = {}
  for (const f of [m.checkPermissions, m.requestPermissions, m.register, m.push]) f.mockReset()
  service = (await vi.importActual<PushModule>('@/services/firebase/push-notification.service'))
    .pushNotificationService
  fs = (await import('firebase/firestore')) as unknown as typeof import('../fakes/firestore')
})

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('pushNotificationService', () => {
  it('web: complete no-op', async () => {
    m.native.value = false
    await service.initialize('u1')
    expect(m.checkPermissions).not.toHaveBeenCalled()
  })

  it('granted: registers and stores the token under the current user', async () => {
    m.checkPermissions.mockResolvedValue({ receive: 'granted' })
    await service.initialize('u1')
    expect(m.register).toHaveBeenCalled()
    m.listeners.registration({ value: 'tok123' })
    await flush()
    expect(fs.__get('users/u1/fcmTokens/tok123')).toMatchObject({ platform: 'android' })
  })

  it('asks for permission when needed; denied → never registers', async () => {
    m.checkPermissions.mockResolvedValue({ receive: 'prompt' })
    m.requestPermissions.mockResolvedValue({ receive: 'denied' })
    await service.initialize('u1')
    expect(m.requestPermissions).toHaveBeenCalled()
    expect(m.register).not.toHaveBeenCalled()
  })

  it('a token arriving after a user switch is saved for the new user; listeners wired once', async () => {
    m.checkPermissions.mockResolvedValue({ receive: 'granted' })
    await service.initialize('u1')
    const first = m.listeners.registration
    await service.initialize('u2')
    expect(m.listeners.registration).toBe(first)
    m.listeners.registration({ value: 'tokB' })
    await flush()
    expect(fs.__get('users/u2/fcmTokens/tokB')).toBeDefined()
    expect(fs.__get('users/u1/fcmTokens/tokB')).toBeUndefined()
  })

  it('tapping a notification navigates to its link', async () => {
    m.checkPermissions.mockResolvedValue({ receive: 'granted' })
    await service.initialize('u1')
    m.listeners.pushNotificationActionPerformed({
      notification: { data: { link: '/messages/c1' } },
    })
    m.listeners.pushNotificationActionPerformed({ notification: { data: {} } })
    expect(m.push).toHaveBeenCalledTimes(1)
    expect(m.push).toHaveBeenCalledWith('/messages/c1')
  })

  it('forgetToken deletes and never throws', async () => {
    fs.__seed('users/u1/fcmTokens/t', { platform: 'android' })
    await service.forgetToken('u1', 't')
    expect(fs.__get('users/u1/fcmTokens/t')).toBeUndefined()
    fs.__failNext('deleteDoc')
    await expect(service.forgetToken('u1', 'x')).resolves.toBeUndefined()
  })
})
