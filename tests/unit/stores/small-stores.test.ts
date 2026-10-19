import { Preferences } from '@capacitor/preferences'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useAvatarStore } from '@/stores/avatar.store'
import { useFontSizeStore } from '@/stores/font-size.store'
import { useLocaleStore } from '@/stores/locale.store'
import { useThemeStore } from '@/stores/theme.store'
import * as fs from '../fakes/firestore'

const flush = () => new Promise((r) => setTimeout(r, 0))
const html = () => document.documentElement

afterEach(async () => {
  await Preferences.clear()
})

describe('locale store', () => {
  it('defaults to zh, restores the saved choice and persists changes', async () => {
    const store = useLocaleStore()
    await store.initialize()
    expect(store.locale).toBe('zh')
    expect(html().getAttribute('lang')).toBe('zh-TW')
    await store.setLocale('en')
    expect(html().getAttribute('lang')).toBe('en')
    expect((await Preferences.get({ key: 'locale' })).value).toBe('en')
  })
  it('ignores a corrupt saved value', async () => {
    await Preferences.set({ key: 'locale', value: 'fr' })
    const store = useLocaleStore()
    await store.initialize()
    expect(store.locale).toBe('zh')
  })
  it('restores en', async () => {
    await Preferences.set({ key: 'locale', value: 'en' })
    const store = useLocaleStore()
    await store.initialize()
    expect(store.locale).toBe('en')
  })
})

describe('theme store', () => {
  it('system → resolved light/dark attribute; explicit choices persist', async () => {
    const store = useThemeStore()
    await store.initialize()
    expect(store.mode).toBe('system')
    expect(['light', 'dark']).toContain(html().getAttribute('data-theme'))
    await store.setMode('dark')
    expect(html().getAttribute('data-theme')).toBe('dark')
    await store.setMode('light')
    expect(html().getAttribute('data-theme')).toBe('light')
    expect((await Preferences.get({ key: 'theme-mode' })).value).toBe('light')
  })
  it('restores a saved mode', async () => {
    await Preferences.set({ key: 'theme-mode', value: 'dark' })
    const store = useThemeStore()
    await store.initialize()
    expect(store.mode).toBe('dark')
    expect(html().getAttribute('data-theme')).toBe('dark')
  })
})

describe('font size store', () => {
  it('defaults to small and persists changes', async () => {
    const store = useFontSizeStore()
    await store.initialize()
    expect(html().getAttribute('data-font-size')).toBe('small')
    await store.setSize('large')
    expect(html().getAttribute('data-font-size')).toBe('large')
    const again = useFontSizeStore()
    expect(again.size).toBe('large')
    expect((await Preferences.get({ key: 'font-size' })).value).toBe('large')
  })
  it('restores medium; ignores garbage', async () => {
    await Preferences.set({ key: 'font-size', value: 'medium' })
    const store = useFontSizeStore()
    await store.initialize()
    expect(store.size).toBe('medium')
    await Preferences.set({ key: 'font-size', value: 'huge' })
    store.size = 'small'
    await store.initialize()
    expect(store.size).toBe('small')
  })
})

describe('avatar store (ref-counted live subscriptions)', () => {
  it('shares one listener per uid and tears it down at refCount 0', async () => {
    fs.__seed('publicAvatars/u1', { photoUrl: 'https://a' })
    const store = useAvatarStore()
    store.subscribe('u1')
    store.subscribe('u1')
    await flush()
    expect(store.photoUrlByUid.u1).toBe('https://a')
    store.unsubscribe('u1')
    fs.__seed('publicAvatars/u1', { photoUrl: 'https://b' })
    await flush()
    expect(store.photoUrlByUid.u1).toBe('https://b')
    store.unsubscribe('u1')
    expect('u1' in store.photoUrlByUid).toBe(false)
    fs.__seed('publicAvatars/u1', { photoUrl: 'https://c' })
    await flush()
    expect('u1' in store.photoUrlByUid).toBe(false)
    store.unsubscribe('never') // no-op
  })

  it('missing doc → undefined (keep fallback)', async () => {
    const store = useAvatarStore()
    store.subscribe('ghost')
    await flush()
    expect(store.photoUrlByUid.ghost).toBeUndefined()
    vi.restoreAllMocks()
  })
})
