import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { verificationService } from '@/services/firebase/verification.service'
import type { VerificationDraft } from '@/types/verification'
import * as fs from '../fakes/firestore'
import * as st from '../fakes/storage'

const NOW = new Date(2026, 9, 18, 12, 0).getTime()

function draft(overrides: Partial<VerificationDraft> = {}): VerificationDraft {
  return {
    vehicleId: 'veh1',
    userId: 'u1',
    type: 'seller',
    status: 'draft',
    createdAt: NOW,
    ...overrides,
  } as VerificationDraft
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})
afterEach(() => vi.useRealTimers())

describe('verificationService.create', () => {
  it('writes protocol v2, isPublic=false, server createdAt and a 5-minute attempt start for sellers', async () => {
    const id = await verificationService.create(draft({ mileage: undefined }))
    const saved = fs.__get(`verifications/${id}`)!
    expect(saved.isPublic).toBe(false)
    expect(saved.protocolVersion).toBe(2)
    expect(saved.schemaVersion).toBe(1)
    expect(saved.createdAt).toBeInstanceOf(fs.Timestamp)
    expect(saved.attemptStartedAt).toBe(NOW)
    expect('mileage' in saved).toBe(false) // undefined stripped
  })

  it('buyer verifications have no time limit (no attemptStartedAt)', async () => {
    const id = await verificationService.create(draft({ type: 'buyer', listingId: 'L1' }))
    const saved = fs.__get(`verifications/${id}`)!
    expect(saved.attemptStartedAt).toBeUndefined()
    expect(saved.listingId).toBe('L1')
  })
})

describe('verificationService reads', () => {
  it('get maps the doc and returns null when missing', async () => {
    fs.__seed('verifications/v1', {
      vehicleId: 'veh1',
      userId: 'u1',
      type: 'buyer',
      status: 'completed',
      createdAt: fs.Timestamp.fromMillis(1000),
      completedAt: 2000, // plain-number write from the trusted backend
      listingId: 'L1',
      buyerModelConfirmed: true,
      attemptStartedAt: 'garbage',
    })
    const v = (await verificationService.get('v1'))!
    expect(v).toMatchObject({
      id: 'v1',
      type: 'buyer',
      status: 'completed',
      createdAt: 1000,
      completedAt: 2000,
      isPublic: false,
      protocolVersion: 2,
      schemaVersion: 1,
      listingId: 'L1',
      buyerModelConfirmed: true,
    })
    expect(v.attemptStartedAt).toBeUndefined()
    expect(await verificationService.get('missing')).toBeNull()
  })

  it('a missing createdAt falls back to "now" instead of throwing', async () => {
    fs.__seed('verifications/v1', {
      vehicleId: 'veh1',
      userId: 'u1',
      type: 'seller',
      status: 'draft',
    })
    expect((await verificationService.get('v1'))!.createdAt).toBe(NOW)
  })

  it('listByUser filters by user and sorts newest first', async () => {
    fs.__seed('verifications/a', { userId: 'u1', createdAt: fs.Timestamp.fromMillis(1) })
    fs.__seed('verifications/b', { userId: 'u1', createdAt: fs.Timestamp.fromMillis(3) })
    fs.__seed('verifications/c', { userId: 'u2', createdAt: fs.Timestamp.fromMillis(2) })
    expect((await verificationService.listByUser('u1')).map((v) => v.id)).toEqual(['b', 'a'])
  })

  it('listByVehicle filters by vehicle, newest first', async () => {
    fs.__seed('verifications/a', { vehicleId: 'x', createdAt: fs.Timestamp.fromMillis(1) })
    fs.__seed('verifications/b', { vehicleId: 'x', createdAt: fs.Timestamp.fromMillis(5) })
    fs.__seed('verifications/c', { vehicleId: 'y', createdAt: fs.Timestamp.fromMillis(9) })
    expect((await verificationService.listByVehicle('x')).map((v) => v.id)).toEqual(['b', 'a'])
  })

  it('subscribeVerification pushes live updates', async () => {
    fs.__seed('verifications/v1', { status: 'draft', createdAt: fs.Timestamp.fromMillis(1) })
    const seen: (string | null)[] = []
    const unsub = verificationService.subscribeVerification('v1', (v) =>
      seen.push(v?.status ?? null),
    )
    await Promise.resolve()
    await verificationService.setStatus('v1', 'completed')
    await Promise.resolve()
    unsub()
    await verificationService.setStatus('v1', 'draft')
    expect(seen).toEqual(['draft', 'completed'])
  })
})

describe('verificationService updates', () => {
  beforeEach(() => {
    fs.__seed('verifications/v1', {
      status: 'draft',
      vehicleSnapshot: { brand: 'YAMAHA', model: 'MT-03', manufactureYear: null, modelId: null },
    })
  })

  it('setStatus / setPublic / complete / saveTransactionDecision', async () => {
    await verificationService.setPublic('v1')
    await verificationService.saveTransactionDecision('v1', 'buy' as never)
    await verificationService.complete('v1')
    const saved = fs.__get('verifications/v1')!
    expect(saved.isPublic).toBe(true)
    expect(saved.status).toBe('completed')
    expect(saved.completedAt).toBeInstanceOf(fs.Timestamp)
    expect(saved.transactionDecision).toBe('buy')
  })

  it('buyer gate writes only touch their own nested field', async () => {
    await verificationService.saveBuyerVehicleYear('v1', 2021)
    await verificationService.saveBuyerVehicleModelId('v1', 'model-mt03')
    await verificationService.markBuyerModelConfirmed('v1')
    await verificationService.saveBuyerKnownIssuesSnapshot('v1', [
      { id: 'k', part: 'sides', description: 'x' },
    ] as never)
    const saved = fs.__get('verifications/v1')!
    expect(saved.vehicleSnapshot).toEqual({
      brand: 'YAMAHA',
      model: 'MT-03',
      manufactureYear: 2021,
      modelId: 'model-mt03',
    })
    expect(saved.buyerModelConfirmed).toBe(true)
    expect(saved.buyerKnownIssuesSnapshot).toHaveLength(1)
  })

  it('updates on a missing verification reject', async () => {
    await expect(verificationService.setStatus('nope', 'draft')).rejects.toThrow()
  })
})

describe('answers & evidence', () => {
  it('saveAnswer strips undefined and stamps updatedAt; listAnswers converts it to millis', async () => {
    await verificationService.saveAnswer('v1', {
      itemId: 'ENG-02',
      result: 'normal',
      note: undefined,
      updatedAt: 0,
    } as never)
    const saved = fs.__get('verifications/v1/answers/ENG-02')!
    expect('note' in saved).toBe(false)
    const [answer] = await verificationService.listAnswers('v1')
    expect(answer).toMatchObject({ itemId: 'ENG-02', result: 'normal', updatedAt: NOW })
  })

  it('listAnswers tolerates plain-number updatedAt from the trusted backend', async () => {
    fs.__seed('verifications/v1/answers/APR-rear', {
      itemId: 'APR-rear',
      result: 'attention',
      updatedAt: 42,
    })
    expect((await verificationService.listAnswers('v1'))[0].updatedAt).toBe(42)
  })

  it('deleteAnswer removes the doc', async () => {
    fs.__seed('verifications/v1/answers/A', { itemId: 'A', result: 'normal' })
    await verificationService.deleteAnswer('v1', 'A')
    expect(fs.__get('verifications/v1/answers/A')).toBeUndefined()
  })

  it('saveEvidence / updateEvidenceRemoteUrl / listEvidence', async () => {
    await verificationService.saveEvidence({
      id: 'e1',
      verificationId: 'v1',
      itemId: 'APR-rear',
      type: 'photo',
      createdAt: 0,
    } as never)
    await verificationService.updateEvidenceRemoteUrl('v1', 'e1', 'verifications/v1/evidence/x.jpg')
    const [ev] = await verificationService.listEvidence('v1')
    expect(ev).toMatchObject({
      id: 'e1',
      remoteUrl: 'verifications/v1/evidence/x.jpg',
      createdAt: NOW,
    })
  })

  it('deleteEvidence deletes the Storage file and the doc', async () => {
    st.__put('verifications/v1/evidence/x.jpg')
    fs.__seed('verifications/v1/evidence/e1', {
      id: 'e1',
      remoteUrl: 'verifications/v1/evidence/x.jpg',
    })
    await verificationService.deleteEvidence('v1', 'e1')
    expect(st.__has('verifications/v1/evidence/x.jpg')).toBe(false)
    expect(fs.__get('verifications/v1/evidence/e1')).toBeUndefined()
  })

  it('deleteEvidence still deletes the doc when the file is already gone', async () => {
    fs.__seed('verifications/v1/evidence/e1', {
      id: 'e1',
      remoteUrl: 'verifications/v1/evidence/gone.jpg',
    })
    await verificationService.deleteEvidence('v1', 'e1')
    expect(fs.__get('verifications/v1/evidence/e1')).toBeUndefined()
  })

  it('remove cascades answers + evidence + the verification', async () => {
    fs.__seed('verifications/v1', { status: 'draft' })
    fs.__seed('verifications/v1/answers/A', { itemId: 'A' })
    fs.__seed('verifications/v1/evidence/E', { id: 'E' })
    fs.__seed('verifications/v2', { status: 'draft' })
    await verificationService.remove('v1')
    expect(fs.__paths('verifications/v1')).toEqual([])
    expect(fs.__get('verifications/v2')).toBeDefined()
  })

  it('expireAttempt wipes answers/evidence/files, resets to draft and restarts the clock', async () => {
    fs.__seed('verifications/v1', { status: 'in_progress', attemptStartedAt: NOW - 600_000 })
    fs.__seed('verifications/v1/answers/A', { itemId: 'A', result: 'normal' })
    fs.__seed('verifications/v1/evidence/E', {
      id: 'E',
      remoteUrl: 'verifications/v1/evidence/e.jpg',
    })
    st.__put('verifications/v1/evidence/e.jpg')
    await verificationService.expireAttempt('v1')
    expect(fs.__paths('verifications/v1/')).toEqual([])
    expect(st.__has('verifications/v1/evidence/e.jpg')).toBe(false)
    expect(fs.__get('verifications/v1')).toMatchObject({ status: 'draft', attemptStartedAt: NOW })
  })
})
