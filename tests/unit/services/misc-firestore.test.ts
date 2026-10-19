import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as ai from '@/services/firebase/ai-analysis.service'
import { homeContentService } from '@/services/firebase/home-content.service'
import { notificationPrefsService } from '@/services/firebase/notification-prefs.service'
import { notificationService } from '@/services/firebase/notification.service'
import { userProfileService } from '@/services/firebase/user-profile.service'
import {
  vehicleModelService,
  type VehicleModelProfile,
} from '@/services/firebase/vehicle-model.service'
import { voltageSessionService } from '@/services/firebase/voltage-session.service'
import { useNotificationStore } from '@/stores/notification.store'
import { DEFAULT_NOTIFICATION_PREFS } from '@/types/notification'
import * as fs from '../fakes/firestore'
import * as fn from '../fakes/functions'

const NOW = new Date(2026, 9, 18, 12, 0).getTime()
const flush = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})
afterEach(() => vi.useRealTimers())

describe('notifications', () => {
  function seed(id: string, read: boolean, at: number) {
    fs.__seed(`users/u1/notifications/${id}`, {
      type: 'system',
      title: id,
      body: '',
      read,
      createdAt: fs.Timestamp.fromMillis(at),
    })
  }

  it('store subscribes newest-first and counts unread', async () => {
    seed('a', false, 1)
    seed('b', true, 2)
    seed('c', false, 3)
    const store = useNotificationStore()
    store.subscribe('u1')
    await flush()
    expect(store.notifications.map((n) => n.id)).toEqual(['c', 'b', 'a'])
    expect(store.notifications[0].link).toBeNull()
    expect(store.unreadCount).toBe(2)
  })

  it('feed is capped at 40', async () => {
    for (let i = 0; i < 45; i++) seed(`n${i}`, false, i)
    let count = 0
    notificationService.subscribeNotifications('u1', (list) => (count = list.length))
    await flush()
    expect(count).toBe(40)
  })

  it('mark read (one / many / all), delete (one / many / all)', async () => {
    seed('a', false, 1)
    seed('b', false, 2)
    seed('c', false, 3)
    const store = useNotificationStore()
    await store.markAsRead('a') // no uid yet → no-op
    expect(fs.__get('users/u1/notifications/a')!.read).toBe(false)
    store.subscribe('u1')
    await flush()
    await store.markAsRead('a')
    await store.markManyAsRead(['b'])
    await flush()
    expect(store.unreadCount).toBe(1)
    await store.markAllAsRead()
    await flush()
    expect(store.unreadCount).toBe(0)
    await store.deleteOne('a')
    await store.deleteMany(['b'])
    await flush()
    expect(store.notifications.map((n) => n.id)).toEqual(['c'])
    await store.clearAll()
    await flush()
    expect(store.notifications).toEqual([])
    await notificationService.markManyAsRead('u1', []) // empty is a no-op
    store.stopSubscription()
    expect(store.loaded).toBe(false)
  })
})

describe('notification prefs', () => {
  it('missing doc / fields default to on', async () => {
    expect(await notificationPrefsService.getPrefs('u1')).toEqual(DEFAULT_NOTIFICATION_PREFS)
    fs.__seed('users/u1', { notificationPrefs: { chat: false } })
    expect(await notificationPrefsService.getPrefs('u1')).toEqual({
      ...DEFAULT_NOTIFICATION_PREFS,
      chat: false,
    })
  })

  it('updatePrefs merges one toggle without touching the others or the profile', async () => {
    fs.__seed('users/u1', { displayName: 'A', notificationPrefs: { chat: false, trade: false } })
    await notificationPrefsService.updatePrefs('u1', { trade: true })
    expect(fs.__get('users/u1')).toEqual({
      displayName: 'A',
      notificationPrefs: { chat: false, trade: true },
    })
  })
})

describe('userProfileService', () => {
  it('touchUserProfile creates the mirror + publicAvatars with defaults', async () => {
    await userProfileService.touchUserProfile('u1', 'a@b.com', 'A', 'https://p')
    expect(fs.__get('users/u1')).toMatchObject({
      uid: 'u1',
      email: 'a@b.com',
      displayName: 'A',
      photoUrl: 'https://p',
      accountTier: 'standard',
      score: 0,
    })
    expect(fs.__get('publicAvatars/u1')).toEqual({ photoUrl: 'https://p' })
  })

  it('preserves existing photo/score/tier/createdAt when not provided', async () => {
    const created = fs.Timestamp.fromMillis(5)
    fs.__seed('users/u1', {
      photoUrl: 'https://old',
      score: 42,
      accountTier: 'dealer',
      createdAt: created,
    })
    await userProfileService.touchUserProfile('u1', 'a@b.com', 'Renamed')
    const saved = fs.__get('users/u1')!
    expect(saved).toMatchObject({
      photoUrl: 'https://old',
      score: 42,
      accountTier: 'dealer',
      displayName: 'Renamed',
    })
    expect((saved.createdAt as fs.Timestamp).toMillis()).toBe(5)
    expect(fs.__get('publicAvatars/u1')).toEqual({ photoUrl: 'https://old' })
  })

  it('subscribePublicAvatar: undefined for no doc, null for an explicit null', async () => {
    const seen: unknown[] = []
    userProfileService.subscribePublicAvatar('u1', (url) => seen.push(url))
    await flush()
    fs.__seed('publicAvatars/u1', { photoUrl: null })
    await flush()
    fs.__seed('publicAvatars/u1', { photoUrl: 'https://x' })
    await flush()
    expect(seen).toEqual([undefined, null, 'https://x'])
  })
})

describe('homeContentService', () => {
  it('lists only published listings, sorted by id, with converted timestamps', async () => {
    fs.__seed('marketplaceListings/demo-2', {
      status: 'published',
      publishedAt: fs.Timestamp.fromMillis(9),
    })
    fs.__seed('marketplaceListings/demo-1', {
      status: 'published',
      createdAt: fs.Timestamp.fromMillis(3),
    })
    fs.__seed('marketplaceListings/draft', { status: 'draft' })
    const list = await homeContentService.listMarketplaceListings()
    expect(list.map((l) => l.id)).toEqual(['demo-1', 'demo-2'])
    expect(list[0]).toMatchObject({ createdAt: 3, publishedAt: null })
    expect(list[1].publishedAt).toBe(9)
    expect(await homeContentService.getMarketplaceListing('nope')).toBeNull()
  })

  it('vehicle news mapping defaults', async () => {
    fs.__seed('vehicleNews/n1', { title: 'T', category: 'C', sourceName: 'S', content: 'x' })
    expect(await homeContentService.getVehicleNews('n1')).toMatchObject({
      coverImageUrl: null,
      sourceUrl: null,
      publishedAt: NOW,
    })
    expect(await homeContentService.listVehicleNews()).toHaveLength(1)
    expect(await homeContentService.getVehicleNews('none')).toBeNull()
  })
})

describe('vehicleModelService', () => {
  it('listAll / getHealthCheckData / getProfile defaults', async () => {
    fs.__seed('vehicleModels/m1', {
      brand: 'YAMAHA',
      series: 'MT',
      trimName: '03',
      hasChain: 1,
      specs: { safety: { abs: true } },
    })
    expect(await vehicleModelService.listAll()).toEqual([
      {
        id: 'm1',
        brand: 'YAMAHA',
        series: 'MT',
        name: '03',
        displacementCc: null,
        transmission: null,
        hasChain: true,
      },
    ])
    expect(await vehicleModelService.getHealthCheckData('m1')).toEqual({
      coverImageUrl: null,
      hasChain: true,
      healthCheckAnchors: null,
    })
    expect(await vehicleModelService.getHealthCheckData('none')).toBeNull()
    const profile = (await vehicleModelService.getProfile('m1'))!
    expect(profile).toMatchObject({
      powerType: 'gasoline',
      knownIssues: [],
      usedPriceRangeTwd: null,
      synonyms: [],
    })
    expect(profile.specs).toMatchObject({ abs: true, tcs: false, weightKg: null })
    expect(await vehicleModelService.listProfiles()).toHaveLength(1)
  })

  describe('findModelIdByText (exact normalized match only)', () => {
    const p = (
      id: string,
      brand: string,
      series: string,
      trimName: string | null,
      synonyms: string[] = [],
    ) => ({ id, brand, series, trimName, synonyms }) as VehicleModelProfile
    const profiles = [
      p('mt03', 'YAMAHA', 'MT', '03'),
      p('mt09', 'YAMAHA', 'MT', '09'),
      p('jet', 'SYM', 'JET', 'SL', ['捷豹']),
      p('force', 'YAMAHA', 'FORCE', null),
    ]
    it.each([
      ['yamaha', 'MT-03', 'mt03'],
      ['YAMAHA', 'mt 09', 'mt09'],
      ['Yamaha', 'Force', 'force'],
      ['SYM', 'JETSL', 'jet'],
      ['SYM', 'SL', 'jet'],
      ['SYM', '捷豹', 'jet'],
    ])('%s %s → %s', (brand, model, expected) => {
      expect(vehicleModelService.findModelIdByText(brand, model, profiles)).toBe(expected)
    })
    it.each([
      ['YAMAHA', 'MT-03 ABS版'],
      ['HONDA', 'MT-03'],
      ['', 'MT-03'],
      ['YAMAHA', ''],
    ])('no match for %s / %s', (brand, model) => {
      expect(vehicleModelService.findModelIdByText(brand, model, profiles)).toBeNull()
    })
  })
})

describe('voltageSessionService', () => {
  it('start / finish', async () => {
    const id = await voltageSessionService.start({
      vehicleId: 'v',
      verificationId: 'ver',
      probeId: 'p',
    } as never)
    await voltageSessionService.finish(id, { restingVoltage: 12.6 } as never)
    expect(fs.__get(`voltageSessions/${id}`)).toMatchObject({
      vehicleId: 'v',
      result: { restingVoltage: 12.6 },
    })
    expect(fs.__get(`voltageSessions/${id}`)!.endedAt).toBeInstanceOf(fs.Timestamp)
  })
})

describe('ai-analysis callables send only ids', () => {
  it('group / OCR / sessions / cold check / registration / maintenance', async () => {
    const result = { itemId: 'x', result: 'normal' }
    for (const name of [
      'analyzeCoreVisionSides',
      'analyzeCoreVisionRear',
      'analyzeCoreVisionFrontSuspension',
      'analyzeCoreVisionEngineBottom',
    ])
      fn.__setCallable(name, () => ({ results: [result] }))
    fn.__setCallable('analyzeOcrDashboard', () => ({
      text: '12345',
      confidence: 0.9,
      note: null,
      evidenceId: 'e',
    }))
    fn.__setCallable('analyzeEngineSensorSessionV2', () => 'ok')
    fn.__setCallable('analyzeHotEngineSensorSessionV2', () => 'hot')
    fn.__setCallable('analyzeColdEngineTouchCheck', () => ({ result }))
    fn.__setCallable('retryColdEngineTouchCheck', () => ({ result }))
    fn.__setCallable('verifyVehicleRegistrationDocument', () => ({ status: 'passed' }))
    fn.__setCallable('analyzeDocumentMaintenance', () => ({ status: 'queued' }))

    expect(await ai.analyzeCoreVisionSides('v')).toEqual([result])
    expect(await ai.analyzeCoreVisionRear('v')).toEqual([result])
    expect(await ai.analyzeCoreVisionFrontSuspension('v')).toEqual([result])
    expect(await ai.analyzeCoreVisionEngineBottom('v')).toEqual([result])
    expect((await ai.analyzeOcrDashboard('v')).text).toBe('12345')
    expect(await ai.analyzeEngineSensorSessionV2('v')).toBe('ok')
    expect(await ai.analyzeHotEngineSensorSessionV2('v')).toBe('hot')
    expect(await ai.analyzeColdEngineTouchCheck('v')).toEqual(result)
    expect(
      await ai.retryColdEngineTouchCheck({ verificationId: 'v', newEvidenceId: 'e2' }),
    ).toEqual(result)
    expect(
      (await ai.verifyVehicleRegistrationDocument({ vehicleId: 'veh', documentUrl: 'u' })).status,
    ).toBe('passed')
    expect(await ai.analyzeDocumentMaintenance('v', 'e')).toEqual({ status: 'queued' })

    const payloadKeys = new Set(fn.calls.flatMap((c) => Object.keys(c.data as object)))
    expect([...payloadKeys].sort()).toEqual([
      'documentUrl',
      'evidenceId',
      'newEvidenceId',
      'vehicleId',
      'verificationId',
    ])
  })
})
