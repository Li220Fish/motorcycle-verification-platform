import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const authMock = vi.hoisted(() => ({ signInWithEmailAndPassword: vi.fn() }))
vi.mock('firebase/auth', () => authMock)

import * as admin from '@/admin/services/admin-data.service'
import { ADMIN_UID, adminLogin, isAdminSession } from '@/admin/services/admin-auth.service'
import { PROMPT_ITEM_MAP } from '@/admin/services/prompt-item-map'
import * as training from '@/admin/services/training-dataset.service'
import { getFlatItems } from '@/data/verification'
import {
  defaultBrakeSetup,
  obbBounds,
  obbCorners,
  trainingCaptureStoragePath,
  yoloObbLine,
} from '@/data/training/training-dataset.types'
import { auth } from '@/services/firebase/firebase'
import * as fs from '../fakes/firestore'
import * as fn from '../fakes/functions'
import * as st from '../fakes/storage'

const NOW = new Date(2026, 9, 18, 12, 0).getTime()
const mutableAuth = auth as unknown as { currentUser: unknown }

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  mutableAuth.currentUser = null
})
afterEach(() => vi.useRealTimers())

describe('admin auth', () => {
  it('only test/test is accepted and is exchanged for the real admin account', async () => {
    await expect(adminLogin('admin', 'x')).rejects.toThrow('帳號或密碼錯誤')
    expect(authMock.signInWithEmailAndPassword).not.toHaveBeenCalled()
    await adminLogin('test', 'test')
    expect(authMock.signInWithEmailAndPassword).toHaveBeenCalledWith(
      auth,
      'admin@test.com',
      expect.any(String),
    )
  })
  it('isAdminSession checks the hardcoded admin uid', () => {
    expect(isAdminSession()).toBe(false)
    mutableAuth.currentUser = { uid: 'someone' }
    expect(isAdminSession()).toBe(false)
    mutableAuth.currentUser = { uid: ADMIN_UID }
    expect(isAdminSession()).toBe(true)
  })
})

describe('prompt → item map', () => {
  it('every referenced item id exists in the checklist', () => {
    const ids = new Set([...getFlatItems('seller'), ...getFlatItems('buyer')].map((f) => f.item.id))
    for (const [key, mapping] of Object.entries(PROMPT_ITEM_MAP)) {
      for (const id of mapping.itemIds) expect(ids.has(id), `${key} → ${id}`).toBe(true)
      if (mapping.itemIds.length === 0) expect(mapping.note, key).toBeTruthy()
    }
  })
  it('global prompt covers the union of the 4 core vision routes', () => {
    const routes = [
      'core-vision-sides-v1',
      'core-vision-rear-v1',
      'core-vision-front-suspension-v1',
      'core-vision-engine-bottom-v1',
    ]
    const union = new Set(routes.flatMap((k) => PROMPT_ITEM_MAP[k].itemIds))
    expect(new Set(PROMPT_ITEM_MAP['global-inspection-v2'].itemIds)).toEqual(union)
  })
})

describe('admin-data: reads', () => {
  it('user profiles + score events (newest first) + transactions', async () => {
    fs.__seed('users/u1', { email: 'a@b.com', createdAt: fs.Timestamp.fromMillis(5) })
    fs.__seed('users/u1/scoreEvents/e1', { delta: 2, reason: 'appointment_kept', createdAt: 1 })
    fs.__seed('users/u1/scoreEvents/e2', { delta: -1, createdAt: 2 })
    fs.__seed('transactions/t1', { buyerId: 'b', sellerId: 's' })
    expect(await admin.listUserProfiles()).toEqual([
      {
        uid: 'u1',
        email: 'a@b.com',
        displayName: null,
        photoUrl: null,
        accountTier: 'standard',
        score: 0,
        createdAt: 5,
        updatedAt: 0,
        lastSeenAt: 0,
      },
    ])
    const events = await admin.listScoreEvents('u1')
    expect(events.map((e) => e.id)).toEqual(['e2', 'e1'])
    expect(events[0]).toMatchObject({ reason: '', rulesVersion: '' })
    expect(await admin.listAllTransactions()).toEqual([
      {
        id: 't1',
        buyerId: 'b',
        sellerId: 's',
        vehicleId: null,
        listingId: null,
        vehicleSnapshot: null,
        priceTwd: null,
        completedAt: 0,
        createdAt: 0,
      },
    ])
  })

  it('listAllVerifications hides untouched drafts', async () => {
    fs.__seed('verifications/a', { status: 'draft' })
    fs.__seed('verifications/b', { status: 'in_progress', createdAt: fs.Timestamp.fromMillis(3) })
    fs.__seed('verifications/c', { status: 'completed', completedAt: 9 })
    const list = await admin.listAllVerifications()
    expect(list.map((v) => v.id).sort()).toEqual(['b', 'c'])
    expect(list.find((v) => v.id === 'c')!.completedAt).toBe(9)
    expect(await admin.getVerificationById('a')).toMatchObject({
      id: 'a',
      status: 'draft',
      completedAt: undefined,
    })
    expect(await admin.getVerificationById('none')).toBeNull()
  })

  it('answers / evidence / listings / appointments / conversations / posts / voltage', async () => {
    fs.__seed('verifications/v/answers/A', { itemId: 'A', updatedAt: 5 })
    fs.__seed('verifications/v/evidence/E', { id: 'E', createdAt: fs.Timestamp.fromMillis(6) })
    fs.__seed('marketplaceListings/L', { publishedAt: 7 })
    fs.__seed('marketplaceListings/L/appointments/p', {
      buyerId: 'b',
      scheduledAt: fs.Timestamp.fromMillis(8),
    })
    fs.__seed('conversations/c', { lastMessageAt: 9 })
    fs.__seed('discussionPosts/d', { title: 't' })
    fs.__seed('voltageSessions/s', { startedAt: 1 })
    expect((await admin.listVerificationAnswers('v'))[0].updatedAt).toBe(5)
    expect((await admin.listVerificationEvidence('v'))[0].createdAt).toBe(6)
    expect((await admin.listAllListings())[0]).toMatchObject({
      id: 'L',
      publishedAt: 7,
      createdAt: 0,
    })
    expect((await admin.listAllAppointments(['L']))[0]).toMatchObject({
      id: 'p',
      listingId: 'L',
      status: 'pending',
      scheduledAt: 8,
    })
    expect((await admin.listAllConversations())[0].lastMessageAt).toBe(9)
    expect((await admin.listAllPosts())[0]).toMatchObject({ id: 'd', createdAt: 0 })
    expect((await admin.listAllVoltageSessions())[0]).toMatchObject({
      startedAt: 1,
      endedAt: undefined,
    })
  })
})

describe('admin-data: moderation & content', () => {
  it('reports resolve/dismiss; posts hide/restore', async () => {
    fs.__seed('discussionReports/r1', {
      reporterId: 'u',
      targetType: 'post',
      targetId: 'p',
      reason: '其他',
    })
    fs.__seed('discussionReports/r2', {
      reporterId: 'u',
      targetType: 'post',
      targetId: 'p',
      reason: '其他',
    })
    fs.__seed('discussionPosts/p', { status: 'active' })
    expect((await admin.listAllReports())[0].status).toBe('pending')
    await admin.resolveReport('r1')
    await admin.dismissReport('r2')
    await admin.hidePost('p')
    expect(fs.__get('discussionReports/r1')!.status).toBe('resolved')
    expect(fs.__get('discussionReports/r2')!.status).toBe('dismissed')
    expect(fs.__get('discussionPosts/p')!.status).toBe('hidden')
    await admin.restorePost('p')
    expect(fs.__get('discussionPosts/p')!.status).toBe('active')
  })

  it('vehicle news create/list/delete; announcements newest first', async () => {
    await admin.createVehicleNews({
      title: 'T',
      category: 'C',
      sourceName: 'S',
      content: 'x',
      coverImageUrl: null,
      sourceUrl: null,
    } as never)
    const [news] = await admin.listAllVehicleNews()
    expect(news).toMatchObject({ title: 'T', publishedAt: NOW })
    await admin.deleteVehicleNews(news.id)
    expect(await admin.listAllVehicleNews()).toEqual([])
    await admin.sendSystemAnnouncement('first', 'b')
    vi.setSystemTime(NOW + 1000)
    await admin.sendSystemAnnouncement('second', 'b')
    expect((await admin.listSystemAnnouncements()).map((a) => a.title)).toEqual(['second', 'first'])
  })

  it('vehicle models: create fills a fully spec-shaped doc; update / cover / anchors / delete', async () => {
    const input: admin.CreateVehicleModelInput = {
      brand: 'YAMAHA',
      series: 'MT',
      modelYear: 2024,
      trimName: '03',
      bodyType: '街車',
      powerType: 'gasoline',
      displacementCc: 321,
      transmission: '6速手排',
      hasChain: true,
      synonyms: ['MT03'],
      knownIssues: [],
      usedPriceRangeTwd: { min: 1, max: 2 },
      specs: {
        maxPowerHp: 42,
        maxTorqueKgm: 3,
        fuelTankCapacityL: 14,
        motorPowerW: null,
        weightKg: 168,
        seatHeightMm: 780,
        officialAverageKmPerL: 25,
        abs: true,
        tcs: false,
        cbs: false,
      },
    }
    const id = await admin.createVehicleModel(input)
    let [model] = await admin.listVehicleModels()
    expect(model).toMatchObject({
      id,
      brand: 'YAMAHA',
      coverImageUrl: null,
      healthCheckAnchors: null,
      realFuelStats: { averageKmPerL: null, vehicleCount: 0 },
    })
    expect(model.specs.engine).toMatchObject({ maxPowerHp: 42, coolingType: null })
    expect(model.specs.safety).toEqual({ abs: true, tcs: false, cbs: false })
    expect(model.features.lighting.ledHeadlight).toBe(false)

    await admin.updateVehicleModel(id, {
      ...input,
      brand: 'Yamaha',
      specs: { ...input.specs, abs: false },
    })
    await admin.setVehicleModelCoverImage(id, 'https://cover')
    await admin.setVehicleModelHealthCheckAnchors(id, { headlight: { x: 1, y: 2, page: 1 } })
    ;[model] = await admin.listVehicleModels()
    expect(model).toMatchObject({
      brand: 'Yamaha',
      coverImageUrl: 'https://cover',
      healthCheckAnchors: { headlight: { x: 1, y: 2, page: 1 } },
    })
    expect(model.specs.safety.abs).toBe(false)
    await admin.deleteVehicleModel(id)
    expect(await admin.listVehicleModels()).toEqual([])
  })

  it('AI prompt catalog / override / reset; conversation name sync', async () => {
    fn.__setCallable('getAiPromptCatalog', () => ({
      prompts: [
        {
          key: 'k',
          label: 'L',
          defaultText: 'd',
          overrideText: null,
          updatedAt: null,
          updatedBy: null,
        },
      ],
    }))
    fn.__setCallable('adminSyncConversationMemberNames', () => ({
      conversationsScanned: 3,
      conversationsUpdated: 1,
    }))
    expect((await admin.listAiPrompts())[0].key).toBe('k')
    mutableAuth.currentUser = { uid: ADMIN_UID, email: 'admin@test.com' }
    await admin.setAiPromptOverride('k', 'new text')
    expect(fs.__get('aiPrompts/k')).toEqual({
      text: 'new text',
      updatedAt: NOW,
      updatedBy: 'admin@test.com',
    })
    await admin.resetAiPromptOverride('k')
    expect(fs.__get('aiPrompts/k')).toBeUndefined()
    expect(await admin.syncConversationMemberNames()).toEqual({
      conversationsScanned: 3,
      conversationsUpdated: 1,
    })
  })
})

describe('deleteUserCascade', () => {
  it('removes everything tied to the user and nothing else', async () => {
    // target user's data
    fs.__seed('users/bad', { email: 'x' })
    fs.__seed('vehicles/v1', { currentOwnerId: 'bad' })
    fs.__seed('vehicles/v1/fuelLogs/f', { a: 1 })
    fs.__seed('vehicles/v1/maintenanceLogs/m', { a: 1 })
    fs.__seed('verifications/ver1', { userId: 'bad', vehicleId: 'other' })
    fs.__seed('verifications/ver1/answers/A', { a: 1 })
    fs.__seed('verifications/ver2', { userId: 'buyer', vehicleId: 'v1' }) // on their vehicle
    fs.__seed('verifications/ver2/evidence/E', { a: 1 })
    fs.__seed('marketplaceListings/L1', { sellerId: 'bad', vehicleId: 'v1' })
    fs.__seed('marketplaceListings/L1/appointments/ap', { a: 1 })
    fs.__seed('discussionPosts/own', { authorId: 'bad' })
    fs.__seed('discussionPosts/own/comments/c1', { authorId: 'someone' })
    fs.__seed('discussionPosts/own/likes/l1', { uid: 'someone' })
    // someone else's post with comments from both
    fs.__seed('discussionPosts/theirs', { authorId: 'good', commentCount: 3 })
    fs.__seed('discussionPosts/theirs/comments/s1', { authorId: 'bad' })
    fs.__seed('discussionPosts/theirs/comments/s2', { authorId: 'bad' })
    fs.__seed('discussionPosts/theirs/comments/keep', { authorId: 'good' })
    // unrelated data
    fs.__seed('users/good', { email: 'y' })
    fs.__seed('vehicles/v2', { currentOwnerId: 'good' })
    fs.__seed('verifications/ver3', { userId: 'good', vehicleId: 'v2' })
    fs.__seed('marketplaceListings/L2', { sellerId: 'good', vehicleId: 'v2' })

    const summary = await admin.deleteUserCascade('bad')
    expect(summary).toEqual({ vehicles: 1, verifications: 2, listings: 1, posts: 1, comments: 3 })
    expect(fs.__paths()).toEqual(
      [
        'discussionPosts/theirs',
        'discussionPosts/theirs/comments/keep',
        'marketplaceListings/L2',
        'users/good',
        'vehicles/v2',
        'verifications/ver3',
      ].sort(),
    )
    expect(fs.__get('discussionPosts/theirs')!.commentCount).toBe(1)
  })
})

describe('training dataset', () => {
  it('lists captures newest-first and lifts legacy {x,y,w,h} boxes to OBB', async () => {
    fs.__seed('trainingCaptures/old', {
      sessionId: 's',
      shotId: 'side-left',
      storagePath: 'p',
      width: 100,
      height: 100,
      capturedAt: 1,
      guideAnnotations: [{ label: 'headlight', box: { x: 0.1, y: 0.2, w: 0.2, h: 0.4 } }],
    })
    fs.__seed('trainingCaptures/new', {
      sessionId: 's',
      shotId: 'rear',
      storagePath: 'p2',
      width: 100,
      height: 100,
      capturedAt: fs.Timestamp.fromMillis(5),
      annotations: [{ label: 'taillight', box: { cx: 0.5, cy: 0.5, w: 0.1, h: 0.1, angle: 10 } }],
      status: 'approved',
    })
    const caps = await training.listTrainingCaptures()
    expect(caps.map((c) => c.id)).toEqual(['new', 'old'])
    const old = caps[1]
    expect(old.guideAnnotations[0].box).toEqual({
      cx: expect.closeTo(0.2),
      cy: expect.closeTo(0.4),
      w: 0.2,
      h: 0.4,
      angle: 0,
    })
    expect(old).toMatchObject({
      vehicleType: 'scooter',
      status: 'pending',
      annotations: null,
      shotPlanVersion: 1,
      reviewedAt: null,
    })
  })

  it('sessions default brakes by vehicle type', async () => {
    fs.__seed('trainingSessions/s', { vehicleType: 'manual', status: 'weird' })
    const [s] = await training.listTrainingSessions()
    expect(s.brakes).toEqual(defaultBrakeSetup('manual'))
    expect(s.status).toBe('open')
    expect(s.hasChain).toBe(false)
  })

  it('saveCaptureReview only keeps a reject reason when rejecting', async () => {
    fs.__seed('trainingCaptures/c', { status: 'pending' })
    await training.saveCaptureReview('c', {
      annotations: [],
      status: 'approved',
      rejectReason: 'blurry',
    })
    expect(fs.__get('trainingCaptures/c')!.rejectReason).toBeNull()
    await training.saveCaptureReview('c', {
      annotations: [],
      status: 'rejected',
      rejectReason: 'blurry',
    })
    expect(fs.__get('trainingCaptures/c')).toMatchObject({
      status: 'rejected',
      rejectReason: 'blurry',
    })
  })

  it('reclassifyCaptures rewrites captures + session in one batch', async () => {
    fs.__seed('trainingCaptures/a', { vehicleModelId: null })
    fs.__seed('trainingCaptures/b', { vehicleModelId: null })
    fs.__seed('trainingSessions/s', { vehicleModelId: null })
    const vehicle = {
      vehicleModelId: 'm1',
      vehicleModelLabel: 'YAMAHA MT-03',
      vehicleType: 'manual' as const,
    }
    await training.reclassifyCaptures(['a', 'b'], 's', vehicle)
    expect(fs.__get('trainingCaptures/a')).toMatchObject(vehicle)
    expect(fs.__get('trainingSessions/s')).toMatchObject(vehicle)
  })

  it('collector allowlist add/list/remove; image URLs are cached', async () => {
    await training.addDataCollector('u9', 'c@x.com')
    expect((await training.listDataCollectors())[0]).toMatchObject({
      uid: 'u9',
      email: 'c@x.com',
      addedAt: NOW,
    })
    await training.removeDataCollector('u9')
    expect(await training.listDataCollectors()).toEqual([])
    st.__put('training/u/s/c.jpg')
    const url = await training.captureImageUrl('training/u/s/c.jpg')
    st.__reset() // cached: no Storage call needed now
    expect(await training.captureImageUrl('training/u/s/c.jpg')).toBe(url)
  })

  it('buildObbManifest includes only approved captures with known labels', () => {
    const base = {
      sessionId: 's',
      storagePath: 'p',
      vehicleModelId: null,
      vehicleModelLabel: '',
      vehicleType: 'scooter',
      shotId: 'x',
      width: 200,
      height: 100,
    }
    const manifest = training.buildObbManifest([
      {
        ...base,
        id: 'a',
        status: 'approved',
        annotations: [
          { label: 'headlight', box: { cx: 0.5, cy: 0.5, w: 0.5, h: 0.5, angle: 0 } },
          { label: 'unknown', box: { cx: 0, cy: 0, w: 0, h: 0, angle: 0 } },
        ],
      },
      { ...base, id: 'b', status: 'pending', annotations: [] },
    ] as never)
    expect(manifest.format).toBe('yolo-obb')
    expect(manifest.names).toHaveLength(13)
    expect(manifest.images.map((i) => i.captureId)).toEqual(['a'])
    expect(manifest.images[0].labels).toHaveLength(1)
    expect(manifest.images[0].labels[0].split(' ')).toHaveLength(9)
  })
})

describe('OBB geometry helpers', () => {
  it('corners / bounds / YOLO line (clamped)', () => {
    const box = { cx: 0.5, cy: 0.5, w: 0.2, h: 0.4, angle: 0 }
    expect(obbCorners(box, 100, 100)).toEqual([
      [40, 30],
      [60, 30],
      [60, 70],
      [40, 70],
    ])
    const b = obbBounds(box, 100, 100)
    expect(b.x).toBeCloseTo(0.4)
    expect(b.w).toBeCloseTo(0.2)
    expect(yoloObbLine(3, box, 100, 100)).toBe(
      '3 0.400000 0.300000 0.600000 0.300000 0.600000 0.700000 0.400000 0.700000',
    )
    const rotated = obbCorners({ ...box, angle: 90 }, 100, 100)
    expect(rotated[0][0]).toBeCloseTo(70)
    expect(
      yoloObbLine(0, { cx: 0, cy: 0, w: 0.5, h: 0.5, angle: 0 }, 10, 10).split(' ').slice(1, 3),
    ).toEqual(['0.000000', '0.000000'])
    expect(trainingCaptureStoragePath('u', 's', 'c')).toBe('training/u/s/c.jpg')
  })
})
