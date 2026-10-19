import { flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Component } from 'vue'

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }))
vi.mock('vue-router', () => ({
  useRouter: () => ({ ...nav, currentRoute: { value: { fullPath: '/', query: {}, params: {} } } }),
  useRoute: () => ({
    query: {},
    params: { id: 'x' },
    fullPath: '/',
    path: '/',
    name: 'x',
    meta: {},
  }),
  onBeforeRouteLeave: vi.fn(),
  onBeforeRouteUpdate: vi.fn(),
  RouterLink: { name: 'RouterLink', render: () => null },
  RouterView: { name: 'RouterView', render: () => null },
  createRouter: vi.fn(),
  createWebHistory: vi.fn(),
}))
vi.mock('@capacitor-community/bluetooth-le', () => ({
  BleClient: { initialize: vi.fn(), isEnabled: vi.fn(async () => false) },
}))
vi.mock('@capawesome/capacitor-torch', () => ({
  Torch: { isAvailable: vi.fn(async () => ({ available: false })), disable: vi.fn(async () => {}) },
}))
vi.mock('capacitor-voice-recorder', () => ({ VoiceRecorder: {} }))
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: unknown, cb: (u: unknown) => void) => {
    cb({
      uid: 'u1',
      email: 'user1@test.com',
      displayName: 'User 1',
      photoURL: null,
      isAnonymous: false,
      emailVerified: true,
      metadata: {},
      providerData: [{ providerId: 'password' }],
    })
    return () => {}
  },
  signInAnonymously: vi.fn(async () => ({ user: { uid: 'anon' } })),
  signInWithEmailAndPassword: vi.fn(),
}))

import { fixtureProps } from './fixtures'
import { useAuthStore } from '@/stores/auth.store'
import * as fn from '../fakes/functions'

/**
 * Renders every view/component once (children stubbed) with realistic props
 * and a signed-in user — catches runtime template errors (undefined access,
 * bad computed, missing i18n key) on screens no dedicated test covers.
 */
const modules = import.meta.glob<{ default: Component }>('/src/**/*.vue', { eager: true })
const entries = Object.entries(modules).sort(([a], [b]) => a.localeCompare(b))

type PropDef = { type?: unknown; required?: boolean } | (() => unknown) | null
function defaultFor(def: PropDef): unknown {
  const type = def && typeof def === 'object' ? def.type : def
  const t = Array.isArray(type) ? type[0] : type
  if (t === String) return 'x'
  if (t === Number) return 0
  if (t === Boolean) return false
  if (t === Array) return []
  if (t === Object) return {}
  if (t === Function) return () => {}
  return undefined
}
function propsFor(path: string, component: Component): Record<string, unknown> {
  const declared = ((component as { props?: Record<string, PropDef> }).props ?? {}) as Record<
    string,
    PropDef
  >
  const generated: Record<string, unknown> = {}
  for (const [name, def] of Object.entries(declared)) {
    if (def && typeof def === 'object' && def.required) generated[name] = defaultFor(def)
  }
  const name = path.split('/').pop()!.replace('.vue', '')
  return { ...generated, ...(fixtureProps[name] ?? {}) }
}

beforeEach(() => {
  useAuthStore().user = {
    id: 'u1',
    email: 'user1@test.com',
    displayName: 'User 1',
    photoUrl: null,
    createdAt: 0,
    updatedAt: 0,
    isAnonymous: false,
    emailVerified: true,
    providerIds: ['password'],
  }
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  fn.__setCallable('getAiPromptCatalog', () => ({ prompts: [] }))
})
afterEach(() => vi.useRealTimers())

describe('every view/component renders', () => {
  it.each(entries.map(([path, mod]) => [path.replace('/src/', ''), mod.default] as const))(
    '%s',
    async (path, component) => {
      const errors: unknown[] = []
      const wrapper = shallowMount(component, {
        props: propsFor(path, component),
        attachTo: document.body,
        global: {
          stubs: { teleport: true, transition: false },
          config: { errorHandler: (err) => void errors.push(err) },
        },
      })
      await flushPromises()
      expect(errors).toEqual([])
      expect(wrapper.html()).toBeTypeOf('string')
      wrapper.unmount()
    },
    20_000,
  )
})
