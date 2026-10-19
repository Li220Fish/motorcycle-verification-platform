import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  onAuthChange: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  signInWithGoogle: vi.fn(),
  signInAnonymous: vi.fn(),
  logout: vi.fn(),
  reloadCurrentUser: vi.fn(),
  updateDisplayName: vi.fn(),
  updatePhotoURL: vi.fn(),
  updateEmail: vi.fn(),
  sendPasswordReset: vi.fn(),
  pushInit: vi.fn(),
}))

vi.mock('@/services/firebase/auth.service', () => mocks)
vi.mock('@/services/firebase/push-notification.service', () => ({
  pushNotificationService: { initialize: mocks.pushInit },
}))

import { useAuthStore } from '@/stores/auth.store'
import * as fs from '../fakes/firestore'

function firebaseUser(overrides: Record<string, unknown> = {}) {
  return {
    uid: 'u1',
    email: 'someone@gmail.com',
    displayName: 'Someone',
    photoURL: null,
    isAnonymous: false,
    emailVerified: false,
    metadata: { creationTime: 'Sat, 17 Oct 2026 00:00:00 GMT' },
    providerData: [{ providerId: 'password' }],
    ...overrides,
  }
}

beforeEach(() => {
  for (const fn of Object.values(mocks)) fn.mockReset()
})

describe('needsEmailVerification', () => {
  async function loginAs(overrides: Record<string, unknown>) {
    const store = useAuthStore()
    mocks.login.mockResolvedValue(firebaseUser(overrides))
    await store.login('x', 'y')
    return store
  }

  it('unverified email/password accounts must verify', async () => {
    expect((await loginAs({})).needsEmailVerification).toBe(true)
  })

  it('verified accounts do not', async () => {
    expect((await loginAs({ emailVerified: true })).needsEmailVerification).toBe(false)
  })

  it('Google accounts must confirm via the email link even though Google marks them verified', async () => {
    const store = await loginAs({
      emailVerified: true,
      providerData: [{ providerId: 'google.com' }],
    })
    expect(store.needsEmailVerification).toBe(true)
    expect(store.isGoogleOnly).toBe(true)
  })

  it('Google accounts with the email-link credential linked are done', async () => {
    const store = await loginAs({
      emailVerified: true,
      providerData: [{ providerId: 'google.com' }, { providerId: 'password' }],
    })
    expect(store.needsEmailVerification).toBe(false)
    expect(store.isGoogleOnly).toBe(false)
  })

  it('Google test accounts stay exempt', async () => {
    const store = await loginAs({
      email: 'agent@test.com',
      providerData: [{ providerId: 'google.com' }],
    })
    expect(store.needsEmailVerification).toBe(false)
  })

  it.each([
    'admin@test.com',
    'user1@test.com',
    'user2@test.com',
    'user3@test.com',
    'agent@test.com',
    'USER1@test.com',
  ])('seeded test account %s is exempt', async (email) => {
    expect((await loginAs({ email })).needsEmailVerification).toBe(false)
  })

  it('anonymous sessions never need it and are not "authenticated"', async () => {
    const store = await loginAs({ isAnonymous: true, providerData: [] })
    expect(store.needsEmailVerification).toBe(false)
    expect(store.isAuthenticated).toBe(false)
  })

  it('no user → false', () => {
    expect(useAuthStore().needsEmailVerification).toBe(false)
  })

  it('refreshEmailVerified picks up the server-side flag', async () => {
    const store = await loginAs({})
    mocks.reloadCurrentUser.mockResolvedValue(firebaseUser({ emailVerified: true }))
    await store.refreshEmailVerified()
    expect(store.user!.emailVerified).toBe(true)
    expect(store.needsEmailVerification).toBe(false)
  })
})

describe('auth store actions', () => {
  it('login maps the Firebase user to the app user and toggles loading', async () => {
    const store = useAuthStore()
    mocks.login.mockResolvedValue(firebaseUser())
    const p = store.login('a', 'b')
    expect(store.loading).toBe(true)
    await p
    expect(store.loading).toBe(false)
    expect(store.user).toMatchObject({
      id: 'u1',
      email: 'someone@gmail.com',
      displayName: 'Someone',
      providerIds: ['password'],
      createdAt: Date.parse('Sat, 17 Oct 2026 00:00:00 GMT'),
    })
    expect(store.isAuthenticated).toBe(true)
  })

  it('a failed login leaves no user and clears loading', async () => {
    const store = useAuthStore()
    mocks.login.mockRejectedValue(new Error('auth/wrong-password'))
    await expect(store.login('a', 'b')).rejects.toThrow()
    expect(store.user).toBeNull()
    expect(store.loading).toBe(false)
  })

  it('register / Google / logout', async () => {
    const store = useAuthStore()
    mocks.register.mockResolvedValue(firebaseUser({ displayName: 'New' }))
    await store.register('a', 'b', 'New')
    expect(mocks.register).toHaveBeenCalledWith('a', 'b', 'New')
    mocks.signInWithGoogle.mockResolvedValue(
      firebaseUser({ providerData: [{ providerId: 'google.com' }], emailVerified: true }),
    )
    await store.loginWithGoogle()
    expect(store.user!.providerIds).toEqual(['google.com'])
    await store.logout()
    expect(store.user).toBeNull()
  })

  it('updateDisplayName / updateAvatarUrl update local state and mirror to users/{uid}', async () => {
    const store = useAuthStore()
    mocks.login.mockResolvedValue(firebaseUser())
    await store.login('a', 'b')
    await store.updateDisplayName('Renamed')
    await store.updateAvatarUrl('https://img/x.jpg')
    await vi.waitFor(() =>
      expect(fs.__get('publicAvatars/u1')).toEqual({ photoUrl: 'https://img/x.jpg' }),
    )
    expect(store.user).toMatchObject({ displayName: 'Renamed', photoUrl: 'https://img/x.jpg' })
    expect(fs.__get('users/u1')).toMatchObject({
      displayName: 'Renamed',
      photoUrl: 'https://img/x.jpg',
    })
  })

  it('updateEmail / sendPasswordReset delegate to the service', async () => {
    const store = useAuthStore()
    await store.updateEmail('n@b.com', 'pw')
    await store.sendPasswordReset('n@b.com')
    expect(mocks.updateEmail).toHaveBeenCalledWith('n@b.com', 'pw')
    expect(mocks.sendPasswordReset).toHaveBeenCalledWith('n@b.com')
  })
})

describe('initialize (auth state listener)', () => {
  it('resolves waitUntilReady, mirrors the profile, registers push and live-syncs the profile', async () => {
    const store = useAuthStore()
    store.initialize()
    store.initialize() // idempotent
    expect(mocks.onAuthChange).toHaveBeenCalledTimes(1)
    const callback = mocks.onAuthChange.mock.calls[0][0]

    callback(firebaseUser())
    await store.waitUntilReady()
    expect(store.loading).toBe(false)
    expect(store.user!.id).toBe('u1')
    expect(mocks.pushInit).toHaveBeenCalledWith('u1')
    await vi.waitFor(() =>
      expect(fs.__get('users/u1')).toMatchObject({ accountTier: 'standard', score: 0 }),
    )

    // A change to users/{uid} from elsewhere reaches the live session.
    fs.__seed('users/u1', { ...fs.__get('users/u1'), displayName: 'From another device' })
    await vi.waitFor(() => expect(store.user!.displayName).toBe('From another device'))

    callback(null)
    expect(store.user).toBeNull()
  })

  it('anonymous sessions skip profile mirroring and push registration', async () => {
    const store = useAuthStore()
    store.initialize()
    mocks.onAuthChange.mock.calls[0][0](firebaseUser({ isAnonymous: true }))
    await store.waitUntilReady()
    expect(mocks.pushInit).not.toHaveBeenCalled()
    expect(fs.__paths()).toEqual([])
  })
})
