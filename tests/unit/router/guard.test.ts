import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ user: null as null | Record<string, unknown> }))

// Same routes/guard as production, but memory history and stub components so
// navigating never loads the real views.
vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  const stub = { render: () => null }
  const stubRoutes = (
    routes: import('vue-router').RouteRecordRaw[],
  ): import('vue-router').RouteRecordRaw[] =>
    routes.map((r) => ({
      ...r,
      ...('component' in r && r.component ? { component: stub } : {}),
      ...(r.children ? { children: stubRoutes(r.children) } : {}),
    })) as never
  return {
    ...actual,
    createRouter: (options: import('vue-router').RouterOptions) =>
      actual.createRouter({
        ...options,
        history: actual.createMemoryHistory(),
        routes: stubRoutes([...options.routes]),
      }),
  }
})
vi.mock('@/services/firebase/auth.service', () => ({
  onAuthChange: (cb: (u: unknown) => void) => cb(state.user),
  reloadCurrentUser: vi.fn(),
}))
vi.mock('@/services/firebase/push-notification.service', () => ({
  pushNotificationService: { initialize: vi.fn() },
}))
vi.mock('@/services/firebase/user-profile.service', () => ({
  userProfileService: { touchUserProfile: vi.fn(), subscribeOwnProfile: () => () => {} },
}))

import router from '@/router'
import { ADMIN_UID } from '@/admin/services/admin-auth.service'
import { auth } from '@/services/firebase/firebase'

function fbUser(overrides: Record<string, unknown> = {}) {
  return {
    uid: 'u1',
    email: 'someone@gmail.com',
    displayName: 'S',
    photoURL: null,
    isAnonymous: false,
    emailVerified: true,
    metadata: {},
    providerData: [{ providerId: 'password' }],
    ...overrides,
  }
}

async function go(path: string) {
  await router.push(path).catch(() => {})
  return router.currentRoute.value
}

beforeEach(async () => {
  state.user = null
  ;(auth as { currentUser: unknown }).currentUser = null
})

describe('router guard', () => {
  it('signed out: protected routes redirect to /login with the target in ?redirect', async () => {
    const route = await go('/vehicles')
    expect(route.name).toBe('login')
    expect(route.query.redirect).toBe('/vehicles')
  })

  it('signed out: public routes stay reachable', async () => {
    expect((await go('/share/abc')).name).toBe('shared-report')
    expect((await go('/dev-log')).name).toBe('dev-log')
    expect((await go('/login')).name).toBe('login')
  })

  it('anonymous-allowed marketplace listing is reachable without a session', async () => {
    expect((await go('/marketplace/demo-1')).name).toBe('marketplace-listing')
    expect((await go('/marketplace')).name).toBe('login')
  })

  it('anonymous sessions count as signed out', async () => {
    state.user = fbUser({ isAnonymous: true, providerData: [] })
    expect((await go('/dashboard')).name).toBe('login')
  })

  it('signed in + verified: /login and /verify-email bounce to the dashboard', async () => {
    state.user = fbUser()
    expect((await go('/vehicles')).name).toBe('vehicles')
    expect((await go('/login')).name).toBe('dashboard')
    expect((await go('/verify-email')).name).toBe('dashboard')
    expect((await go('/')).name).toBe('dashboard')
  })

  it('unverified email/password account is locked to /verify-email', async () => {
    state.user = fbUser({ emailVerified: false })
    const route = await go('/my-listings')
    expect(route.name).toBe('verify-email')
    expect(route.query.redirect).toBe('/my-listings')
    expect((await go('/login')).query.redirect).toBeUndefined()
    expect((await go('/verify-email')).name).toBe('verify-email')
    expect((await go('/share/x')).name).toBe('shared-report') // public pages still open
  })

  it('Google accounts are locked to /verify-email until the email link is linked', async () => {
    state.user = fbUser({ emailVerified: true, providerData: [{ providerId: 'google.com' }] })
    expect((await go('/settings')).name).toBe('verify-email')
  })

  it('linked Google accounts are not locked', async () => {
    state.user = fbUser({
      emailVerified: true,
      providerData: [{ providerId: 'google.com' }, { providerId: 'password' }],
    })
    expect((await go('/settings')).name).toBe('settings')
  })

  it('a confirmation link opened while signed out still reaches /verify-email', async () => {
    const route = await go('/verify-email?mode=signIn&oobCode=abc&apiKey=k')
    expect(route.name).toBe('verify-email')
    expect((await go('/verify-email')).name).toBe('login') // plain visit still needs a session
  })

  it('the check runs on every visit, not only right after sign-up', async () => {
    state.user = fbUser({ emailVerified: false })
    expect((await go('/dashboard')).name).toBe('verify-email')
    expect((await go('/vehicles')).name).toBe('verify-email')
    expect((await go('/marketplace')).name).toBe('verify-email')
  })

  it('test account exemption', async () => {
    state.user = fbUser({ emailVerified: false, email: 'user2@test.com' })
    expect((await go('/settings')).name).toBe('settings')
  })

  it('/admin requires the admin uid; /admin/login bounces an admin to the dashboard', async () => {
    expect((await go('/admin/users')).name).toBe('admin-login')
    ;(auth as { currentUser: unknown }).currentUser = { uid: ADMIN_UID }
    expect((await go('/admin/users')).name).toBe('admin-dashboard')
    expect((await go('/admin/login')).name).toBe('admin-dashboard')
    ;(auth as { currentUser: unknown }).currentUser = { uid: 'not-admin' }
    expect((await go('/admin/verifications/v1')).name).toBe('admin-login')
  })

  it('every route has a name and a component or redirect', () => {
    for (const r of router.getRoutes()) {
      expect(r.name ?? r.redirect, r.path).toBeTruthy()
    }
    const names = router
      .getRoutes()
      .map((r) => r.name)
      .filter(Boolean)
    expect(new Set(names).size).toBe(names.length)
  })
})
