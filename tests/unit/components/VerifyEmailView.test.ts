import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  replace: vi.fn(),
  query: {} as Record<string, string>,
  send: vi.fn(),
  reload: vi.fn(),
  logout: vi.fn(),
  sendLink: vi.fn(),
  complete: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ replace: m.replace }),
  useRoute: () => ({ query: m.query }),
}))
vi.mock('@/services/firebase/auth.service', () => ({
  sendVerificationEmail: m.send,
  sendGoogleAccountVerificationLink: m.sendLink,
  completeEmailLinkVerification: m.complete,
  reloadCurrentUser: m.reload,
  logout: m.logout,
}))
vi.mock('@/services/firebase/push-notification.service', () => ({
  pushNotificationService: { initialize: vi.fn() },
}))

import VerifyEmailView from '@/views/VerifyEmailView.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useLocaleStore } from '@/stores/locale.store'

function signInUnverified() {
  useAuthStore().user = {
    id: 'u1',
    email: 'someone@gmail.com',
    displayName: null,
    photoUrl: null,
    createdAt: 0,
    updatedAt: 0,
    isAnonymous: false,
    emailVerified: false,
    providerIds: ['password'],
  }
}
const verifiedUser = { emailVerified: true, providerData: [{ providerId: 'password' }] }
const unverifiedUser = { emailVerified: false, providerData: [{ providerId: 'password' }] }

beforeEach(() => {
  vi.useFakeTimers()
  for (const fn of [m.replace, m.send, m.reload, m.logout, m.sendLink, m.complete]) fn.mockReset()
  m.query = {}
  signInUnverified()
})
afterEach(() => vi.useRealTimers())

describe('VerifyEmailView', () => {
  it('sends the verification email on mount (zh-TW template) and shows the address', async () => {
    const wrapper = mount(VerifyEmailView)
    await flushPromises()
    expect(m.send).toHaveBeenCalledWith('zh-TW')
    expect(wrapper.text()).toContain('someone@gmail.com')
    expect(wrapper.find('.info').exists()).toBe(true)
  })

  it('uses the English template in English mode', async () => {
    useLocaleStore().locale = 'en'
    mount(VerifyEmailView)
    await flushPromises()
    expect(m.send).toHaveBeenCalledWith('en')
  })

  it('resend is on a 60s cooldown', async () => {
    const wrapper = mount(VerifyEmailView)
    await flushPromises()
    const resend = wrapper.findAll('.link-btn')[0]
    expect(resend.attributes('disabled')).toBeDefined()
    expect(resend.text()).toContain('60')
    await vi.advanceTimersByTimeAsync(60_000)
    expect(resend.attributes('disabled')).toBeUndefined()
    await resend.trigger('click')
    await flushPromises()
    expect(m.send).toHaveBeenCalledTimes(2)
  })

  it('too-many-requests is treated as "already sent", other failures show an error', async () => {
    m.send.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'auth/too-many-requests' }))
    let wrapper = mount(VerifyEmailView)
    await flushPromises()
    expect(wrapper.find('.error').exists()).toBe(false)
    expect(wrapper.find('.info').exists()).toBe(true)
    wrapper.unmount()

    vi.spyOn(console, 'error').mockImplementation(() => {})
    m.send.mockRejectedValueOnce(new Error('network'))
    wrapper = mount(VerifyEmailView)
    await flushPromises()
    expect(wrapper.find('.error').exists()).toBe(true)
  })

  it('"I verified" re-checks: not yet → message; verified → continue to ?redirect', async () => {
    m.query = { redirect: '/my-listings' }
    m.reload.mockResolvedValue(unverifiedUser)
    const wrapper = mount(VerifyEmailView)
    await flushPromises()
    await wrapper.find('button.primary-button, button').trigger('click')
    await flushPromises()
    expect(wrapper.find('.error').exists()).toBe(true)
    expect(m.replace).not.toHaveBeenCalled()

    m.reload.mockResolvedValue(verifiedUser)
    await wrapper.findAll('button')[0].trigger('click')
    await flushPromises()
    expect(m.replace).toHaveBeenCalledWith('/my-listings')
  })

  it('background poll every 5s picks up verification silently and goes to the dashboard', async () => {
    m.reload.mockResolvedValue(unverifiedUser)
    const wrapper = mount(VerifyEmailView)
    await flushPromises()
    await vi.advanceTimersByTimeAsync(5000)
    expect(m.reload).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.error').exists()).toBe(false) // silent
    m.reload.mockResolvedValue(verifiedUser)
    await vi.advanceTimersByTimeAsync(5000)
    expect(m.replace).toHaveBeenCalledWith('/dashboard')
    wrapper.unmount()
    m.reload.mockClear()
    await vi.advanceTimersByTimeAsync(20_000)
    expect(m.reload).not.toHaveBeenCalled() // polling stopped
  })

  it('returning to the app (visibilitychange) re-checks', async () => {
    m.reload.mockResolvedValue(verifiedUser)
    mount(VerifyEmailView)
    await flushPromises()
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    await flushPromises()
    expect(m.replace).toHaveBeenCalledWith('/dashboard')
  })

  it('log out goes back to login', async () => {
    const wrapper = mount(VerifyEmailView)
    await flushPromises()
    await wrapper.find('.link-btn.muted').trigger('click')
    await flushPromises()
    expect(m.logout).toHaveBeenCalled()
    expect(m.replace).toHaveBeenCalledWith({ name: 'login' })
    expect(useAuthStore().user).toBeNull()
  })

  it('Google account: sends the Gmail confirmation link (not a plain verification email)', async () => {
    useAuthStore().user = {
      ...useAuthStore().user!,
      email: 'me@gmail.com',
      emailVerified: true,
      providerIds: ['google.com'],
    }
    const wrapper = mount(VerifyEmailView)
    await flushPromises()
    expect(m.sendLink).toHaveBeenCalledWith('zh-TW')
    expect(m.send).not.toHaveBeenCalled()
    expect(wrapper.find('.hint').text()).toContain('Gmail')
    expect(wrapper.find('.hint').text()).toContain('me@gmail.com')
  })

  it('opened from the emailed link: completes it, refreshes, clears the code and does not resend', async () => {
    m.query = { mode: 'signIn', oobCode: 'abc' }
    m.complete.mockResolvedValue(true)
    m.reload.mockResolvedValue(verifiedUser)
    const wrapper = mount(VerifyEmailView)
    await flushPromises()
    expect(m.complete).toHaveBeenCalledWith(window.location.href)
    expect(m.send).not.toHaveBeenCalled()
    expect(m.sendLink).not.toHaveBeenCalled()
    expect(m.replace).toHaveBeenCalledWith({ name: 'verify-email', query: {} })
    expect(wrapper.find('.info').text()).toContain('驗證完成')
  })

  it('an expired / invalid link shows an error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    m.query = { mode: 'signIn', oobCode: 'old' }
    m.complete.mockRejectedValue(
      Object.assign(new Error('x'), { code: 'auth/invalid-action-code' }),
    )
    const wrapper = mount(VerifyEmailView)
    await flushPromises()
    expect(wrapper.find('.error').text()).toContain('過期')
  })
})
