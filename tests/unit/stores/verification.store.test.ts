import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getFlatItems } from '@/data/verification'
import { localDraftService } from '@/services/verification/local-draft.service'
import { useUploadQueueStore } from '@/stores/upload-queue.store'
import { useVehicleStore } from '@/stores/vehicle.store'
import { useVerificationStore } from '@/stores/verification.store'
import type { VerificationEvidence } from '@/types/verification-evidence'
import * as fs from '../fakes/firestore'
import * as fn from '../fakes/functions'
import * as st from '../fakes/storage'

const NOW = new Date(2026, 9, 18, 12, 0).getTime()

function seedVerification(
  type: 'seller' | 'buyer' = 'seller',
  extra: Record<string, unknown> = {},
) {
  fs.__seed('verifications/v1', {
    vehicleId: 'veh1',
    userId: 'u1',
    type,
    status: 'draft',
    createdAt: fs.Timestamp.fromMillis(NOW - 1000),
    ...extra,
  })
}

function setVehicle(transmission: string | null) {
  useVehicleStore().currentVehicle = { id: 'veh1', transmission } as never
}

async function load(
  type: 'seller' | 'buyer' = 'seller',
  transmission: string | null = '6速手排',
  extra = {},
) {
  seedVerification(type, extra)
  setVehicle(transmission)
  const store = useVerificationStore()
  await store.loadFlow('v1')
  return store
}

function evidence(
  itemId: string,
  overrides: Partial<VerificationEvidence> = {},
): VerificationEvidence {
  return {
    id: `ev-${itemId}-${Math.random().toString(36).slice(2, 7)}`,
    verificationId: 'v1',
    itemId,
    type: 'photo',
    createdAt: Date.now(),
    captureSource: 'camera',
    captureTimestamp: Date.now(),
    ...overrides,
  }
}

const flush = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  for (const name of [
    'analyzeCoreVisionSides',
    'analyzeCoreVisionRear',
    'analyzeCoreVisionFrontSuspension',
    'analyzeCoreVisionEngineBottom',
    'analyzeOcrDashboard',
    'analyzeDocumentMaintenance',
    'analyzeColdEngineTouchCheck',
    'analyzeEngineSensorSessionV2',
    'analyzeHotEngineSensorSessionV2',
  ])
    fn.__setCallable(name, () => ({ results: [] }))
})
afterEach(() => vi.useRealTimers())

describe('loadFlow', () => {
  it('loads the verification and marks the flow loaded', async () => {
    const store = await load()
    expect(store.currentVerification!.id).toBe('v1')
    expect(store.flowLoaded).toBe(true)
    expect(store.flowKind).toBe('seller')
    expect(store.flatItems.length).toBeGreaterThan(0)
  })

  it('a missing verification leaves flowLoaded false', async () => {
    const store = useVerificationStore()
    await store.loadFlow('nope')
    expect(store.currentVerification).toBeNull()
    expect(store.flowLoaded).toBe(false)
    expect(store.flatItems).toEqual([])
  })

  it('merges remote + local answers, newest updatedAt wins', async () => {
    fs.__seed('verifications/v1/answers/A', { itemId: 'A', result: 'normal', updatedAt: 100 })
    fs.__seed('verifications/v1/answers/B', { itemId: 'B', result: 'normal', updatedAt: 300 })
    localDraftService.saveAnswer('v1', { itemId: 'A', result: 'attention', updatedAt: 200 })
    localDraftService.saveAnswer('v1', { itemId: 'B', result: 'attention', updatedAt: 200 })
    const store = await load()
    expect(store.answers.A.result).toBe('attention')
    expect(store.answers.B.result).toBe('normal')
  })

  it('pushes local-only answers/evidence but never overwrites remote copies', async () => {
    fs.__seed('verifications/v1/answers/R', {
      itemId: 'R',
      result: 'normal',
      updatedAt: 1,
      aiResult: { label: 'kept' },
    })
    localDraftService.saveAnswer('v1', { itemId: 'R', result: 'normal', updatedAt: 999 })
    localDraftService.saveAnswer('v1', { itemId: 'L', result: 'normal', updatedAt: 5 })
    fs.__seed('verifications/v1/evidence/e1', { id: 'e1', itemId: 'APR-rear', remoteUrl: 'path' })
    localDraftService.saveEvidence('v1', evidence('APR-rear', { id: 'e1' }))
    localDraftService.saveEvidence('v1', evidence('APR-rear', { id: 'e2' }))
    const store = await load()
    await flush()
    expect(fs.__get('verifications/v1/answers/R')!.aiResult).toEqual({ label: 'kept' })
    expect(fs.__get('verifications/v1/answers/L')).toBeDefined()
    expect(fs.__get('verifications/v1/evidence/e1')!.remoteUrl).toBe('path')
    expect(fs.__get('verifications/v1/evidence/e2')).toBeDefined()
    expect(store.evidenceByItem['APR-rear'].map((e) => e.id)).toEqual(['e1', 'e2'])
  })

  it('live analysisStatus updates flow into currentVerification', async () => {
    const store = await load()
    await flush()
    fs.__seed('verifications/v1', {
      ...fs.__get('verifications/v1'),
      analysisStatus: { coldCheck: { status: 'processing' } },
    })
    await vi.waitFor(() => expect(store.pendingRequiredAnalysis).toEqual(['coldCheck']))
  })
})

describe('flow filtering', () => {
  it('chain items are hidden only for confirmed scooters', async () => {
    const scooter = await load('seller', 'CVT 無段變速')
    expect(scooter.hasExposedChainSprocket).toBe(false)
    expect(scooter.flatItems.some((f) => f.item.id === 'APR-transmission-chain')).toBe(false)
  })

  it('unknown transmission keeps the chain step (never silently dropped)', async () => {
    const unknown = await load('seller', null)
    expect(unknown.hasExposedChainSprocket).toBe(true)
    expect(unknown.flatItems.some((f) => f.item.id === 'APR-transmission-chain')).toBe(true)
  })

  it('visibleWhen items appear only after the matching disclosure selection', async () => {
    const store = await load()
    const visible = () => store.flatItems.some((f) => f.item.id === 'PREP-02-DAMAGE-PHOTOS')
    expect(visible()).toBe(false)
    await store.saveAnswer('PREP-02', 'attention', undefined, undefined, ['collision'])
    expect(visible()).toBe(true)
    await store.saveAnswer('PREP-02', 'attention', undefined, undefined, ['flood'])
    expect(visible()).toBe(false)
  })

  it('buyer flow drops every optional item', async () => {
    const store = await load('buyer')
    expect(store.flowKind).toBe('buyer')
    expect(store.flatItems.every((f) => f.item.required)).toBe(true)
    expect(store.flatItems.some((f) => f.item.id === 'BUYER-APP-steer')).toBe(true)
    expect(store.flatItems.some((f) => f.item.id === 'HOT-07')).toBe(true)
    expect(store.flatItems.some((f) => f.item.id.startsWith('APR-'))).toBe(false)
    expect(store.sections.every((s) => s.items.every((i) => i.required))).toBe(true)
  })
})

describe('answers', () => {
  it('saveAnswer stores locally + remotely and moves draft → in_progress', async () => {
    const store = await load()
    await store.saveAnswer('APR-rear', 'normal', 'ok')
    await flush()
    expect(store.answers['APR-rear']).toMatchObject({
      result: 'normal',
      note: 'ok',
      updatedAt: NOW,
    })
    expect(localDraftService.loadAnswers('v1').map((a) => a.itemId)).toContain('APR-rear')
    expect(fs.__get('verifications/v1/answers/APR-rear')!.result).toBe('normal')
    expect(store.currentVerification!.status).toBe('in_progress')
    expect(fs.__get('verifications/v1')!.status).toBe('in_progress')
  })

  it('saveAnswer is a no-op with no verification loaded', async () => {
    const store = useVerificationStore()
    await store.saveAnswer('X', 'normal')
    expect(store.answers).toEqual({})
  })

  it('removeAnswer clears memory, local draft and Firestore', async () => {
    const store = await load()
    await store.saveAnswer('APR-rear', 'normal')
    await flush()
    await store.removeAnswer('APR-rear')
    expect(store.answers['APR-rear']).toBeUndefined()
    expect(localDraftService.loadAnswers('v1')).toEqual([])
    expect(fs.__get('verifications/v1/answers/APR-rear')).toBeUndefined()
  })
})

describe('evidence', () => {
  it('addEvidence persists and triggers the matching Core Vision group once all its photos exist', async () => {
    const store = await load()
    await store.addEvidence(evidence('APR-left-side'))
    await flush()
    expect(fn.calls.map((c) => c.name)).toEqual([])
    await store.addEvidence(evidence('APR-right-side'))
    await flush()
    expect(fn.calls).toEqual([{ name: 'analyzeCoreVisionSides', data: { verificationId: 'v1' } }])
    expect(fs.__paths('verifications/v1/evidence/')).toHaveLength(2)
  })

  it('rear / dashboard OCR / maintenance document fire on their own', async () => {
    const store = await load()
    await store.addEvidence(evidence('APR-rear'))
    await store.addEvidence(evidence('APR-dashboard'))
    const doc = evidence('PREP-01')
    await store.addEvidence(doc)
    await flush()
    expect(fn.calls.map((c) => c.name)).toEqual([
      'analyzeCoreVisionRear',
      'analyzeOcrDashboard',
      'analyzeDocumentMaintenance',
    ])
    expect(fn.calls[2].data).toEqual({ verificationId: 'v1', evidenceId: doc.id })
  })

  it('engine-bottom waits for the chain photo on chain bikes, not on scooters', async () => {
    const chain = await load('seller', '6速手排')
    await chain.addEvidence(evidence('APR-engine-bottom'))
    await flush()
    expect(fn.calls).toEqual([])
    await chain.addEvidence(evidence('APR-transmission-chain'))
    await flush()
    expect(fn.calls.map((c) => c.name)).toEqual(['analyzeCoreVisionEngineBottom'])
  })

  it('engine-bottom fires immediately for scooters', async () => {
    const scooter = await load('seller', '速克達')
    await scooter.addEvidence(evidence('APR-engine-bottom'))
    await flush()
    expect(fn.calls.map((c) => c.name)).toEqual(['analyzeCoreVisionEngineBottom'])
  })

  it('a failing AI trigger never breaks the capture', async () => {
    fn.__setCallable('analyzeCoreVisionRear', () => {
      throw new Error('boom')
    })
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const store = await load()
    await expect(store.addEvidence(evidence('APR-rear'))).resolves.toBeUndefined()
    await flush()
    expect(spy).toHaveBeenCalled()
  })

  it('discardOtherEvidence keeps only the newest photo (Storage + Firestore + local)', async () => {
    const store = await load()
    const old = evidence('BASIC-headlight', {
      id: 'old',
      remoteUrl: 'verifications/v1/evidence/old.jpg',
    })
    st.__put('verifications/v1/evidence/old.jpg')
    await store.addEvidence(old)
    await flush()
    const fresh = evidence('BASIC-headlight', { id: 'new' })
    await store.addEvidence(fresh)
    await store.discardOtherEvidence('BASIC-headlight', 'new')
    expect(store.evidenceByItem['BASIC-headlight'].map((e) => e.id)).toEqual(['new'])
    expect(localDraftService.loadEvidence('v1').map((e) => e.id)).toEqual(['new'])
    expect(fs.__get('verifications/v1/evidence/old')).toBeUndefined()
    expect(st.__has('verifications/v1/evidence/old.jpg')).toBe(false)
  })
})

describe('navigation helpers', () => {
  it('resolveNextIndex follows a branch and auto-fills skipped items as not_applicable', async () => {
    const store = await load()
    const idx = (id: string) => store.flatItems.findIndex((f) => f.item.id === id)
    await store.saveAnswer('ELEC-10', 'normal')
    const next = store.resolveNextIndex(idx('ELEC-10'))
    expect(next).toBe(idx('ENG-01'))
    for (const id of ['ELEC-11', 'ELEC-12', 'ELEC-13']) {
      if (idx(id) !== -1) expect(store.answers[id]?.result).toBe('not_applicable')
    }
  })

  it('resolveNextIndex is +1 without a matching branch rule, and keeps manual answers', async () => {
    const store = await load()
    const idx = (id: string) => store.flatItems.findIndex((f) => f.item.id === id)
    await store.saveAnswer('ELEC-10', 'attention')
    expect(store.resolveNextIndex(idx('ELEC-10'))).toBe(idx('ELEC-10') + 1)
    expect(store.resolveNextIndex(9999)).toBe(10000)
  })

  it('resumeIndex = first unanswered item (last item when all answered)', async () => {
    const store = await load()
    expect(store.resumeIndex).toBe(0)
    await store.saveAnswer(store.flatItems[0].item.id, 'normal')
    expect(store.resumeIndex).toBe(1)
    for (const f of store.flatItems) await store.saveAnswer(f.item.id, 'normal')
    expect(store.resumeIndex).toBe(store.flatItems.length - 1)
  })

  it('progress counters', async () => {
    const store = await load()
    expect(store.overallProgress).toMatchObject({ done: 0, percent: 0 })
    await store.saveAnswer(store.flatItems[0].item.id, 'normal')
    expect(store.overallProgress.done).toBe(1)
    const first = store.sectionProgress.find((s) => s.sectionId === store.flatItems[0].section.id)!
    expect(first.done).toBe(1)
  })

  it('verificationTier: basic → detailed → complete as optional disclosures get answered', async () => {
    const store = await load()
    expect(store.verificationTier).toBe('basic')
    const optional = store.flatItems.filter((f) => !f.item.required)
    await store.saveAnswer(optional[0].item.id, 'normal')
    expect(store.verificationTier).toBe('detailed')
    for (const f of store.flatItems.filter((x) => !x.item.required))
      await store.saveAnswer(f.item.id, 'normal')
    expect(store.verificationTier).toBe('complete')
  })
})

describe('completion gate', () => {
  async function answerEverything(store: ReturnType<typeof useVerificationStore>) {
    for (const f of store.flatItems) {
      await store.saveAnswer(f.item.id, 'normal')
      for (const req of f.item.evidence ?? []) {
        if (!req.required) continue
        const type = req.kind === 'motion' ? 'imu' : req.kind
        store.evidenceByItem[f.item.id] = [
          ...(store.evidenceByItem[f.item.id] ?? []),
          evidence(f.item.id, { type: type as never, remoteUrl: 'uploaded' }),
        ]
      }
    }
  }

  it('blocks completion while required items are missing', async () => {
    const store = await load()
    expect(store.missingRequiredItems.length).toBeGreaterThan(0)
    expect(store.canComplete).toBe(false)
    await expect(store.completeVerification('v1')).rejects.toThrow('尚有必填項目未完成')
  })

  it('completes once everything is answered, uploaded and analyzed', async () => {
    const store = await load()
    await answerEverything(store)
    expect(store.missingRequiredItems).toEqual([])
    expect(store.canComplete).toBe(true)
    await store.completeVerification('v1')
    expect(store.currentVerification!.status).toBe('completed')
    expect(fs.__get('verifications/v1')!.status).toBe('completed')
  })

  it('pending / failed uploads block completion with distinct messages', async () => {
    const store = await load()
    await answerEverything(store)
    const queue = useUploadQueueStore()
    const target = store.flatItems.find((f) => f.item.evidence?.some((r) => r.required))!
    const ev = evidence(target.item.id, { id: 'q1' })
    store.evidenceByItem[target.item.id] = [ev]
    queue.entries['q1'] = { localId: 'q1', uploadStatus: 'uploading' } as never
    expect(store.pendingRequiredUploads.map((m) => m.itemId)).toEqual([target.item.id])
    await expect(store.completeVerification('v1')).rejects.toThrow('正在完成最後幾筆資料上傳')
    queue.entries['q1'] = { localId: 'q1', uploadStatus: 'failed' } as never
    expect(store.failedRequiredUploads.map((m) => m.itemId)).toEqual([target.item.id])
    await expect(store.completeVerification('v1')).rejects.toThrow('上傳失敗')
  })

  it('processing / failed AI analysis blocks completion', async () => {
    const store = await load()
    await answerEverything(store)
    store.currentVerification = {
      ...store.currentVerification!,
      analysisStatus: { dashboardOcr: { status: 'processing' } },
    } as never
    await expect(store.completeVerification('v1')).rejects.toThrow('AI 分析正在進行中')
    store.currentVerification = {
      ...(store.currentVerification as object),
      analysisStatus: { dashboardOcr: { status: 'failed' } },
    } as never
    expect(store.failedRequiredAnalysis).toEqual(['dashboardOcr'])
    await expect(store.completeVerification('v1')).rejects.toThrow('AI 分析失敗')
  })

  it('error messages follow the locale', async () => {
    const { useLocaleStore } = await import('@/stores/locale.store')
    useLocaleStore().locale = 'en'
    const store = await load()
    await expect(store.completeVerification('v1')).rejects.toThrow(
      'Some required items are not done yet',
    )
  })
})

describe('locked engine section', () => {
  it('isItemAdvanceReady gates locked items on answer + required evidence + cold-check AI', async () => {
    const store = await load()
    const flat = (id: string) => store.flatItems.find((f) => f.item.id === id)!
    expect(store.isItemAdvanceReady(flat('APR-rear'))).toBe(true) // non-locked section: free

    expect(store.isItemAdvanceReady(flat('ENG-03'))).toBe(false)
    await store.saveAnswer('ENG-03', 'normal')
    expect(store.isItemAdvanceReady(flat('ENG-03'))).toBe(false)
    store.evidenceByItem['ENG-03'] = [evidence('ENG-03', { type: 'audio' })]
    expect(store.isItemAdvanceReady(flat('ENG-03'))).toBe(true)

    await store.saveAnswer('ENG-07', 'normal')
    store.evidenceByItem['ENG-07'] = [evidence('ENG-07', { type: 'imu' })]
    expect(store.isItemAdvanceReady(flat('ENG-07'))).toBe(true)

    await store.saveAnswer('ENG-02', 'normal')
    store.evidenceByItem['ENG-02'] = [evidence('ENG-02', { type: 'video' })]
    expect(store.isItemAdvanceReady(flat('ENG-02'))).toBe(false)
    store.currentVerification = {
      ...store.currentVerification!,
      analysisStatus: { coldCheck: { status: 'completed' } },
    } as never
    expect(store.isItemAdvanceReady(flat('ENG-02'))).toBe(true)
  })

  it('resetLockedEngineSection wipes the section and rewinds the bookmark', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout'] })
    vi.setSystemTime(NOW)
    const store = await load()
    await store.saveAnswer('ENG-02', 'normal')
    await store.saveAnswer('ENG-03', 'normal')
    await store.saveAnswer('APR-rear', 'normal')
    await store.addEvidence(evidence('ENG-03', { type: 'audio' }))
    await store.resetLockedEngineSection()
    expect(store.answers['ENG-02']).toBeUndefined()
    expect(store.answers['ENG-03']).toBeUndefined()
    expect(store.answers['APR-rear']).toBeDefined()
    expect(store.evidenceByItem['ENG-03']).toEqual([])
    const locked = store.sections.find((s) => s.id === 'seller-phase3-engine')!
    expect(localDraftService.loadLastPosition('v1')).toBe(locked.items[0].id)

    // A late AI verdict lands with no evidence behind it → swept away.
    fs.__seed('verifications/v1/answers/ENG-02', {
      itemId: 'ENG-02',
      result: 'normal',
      updatedAt: NOW,
    })
    await vi.advanceTimersByTimeAsync(10_000)
    await vi.waitFor(() => expect(fs.__get('verifications/v1/answers/ENG-02')).toBeUndefined())
  })
})

describe('5-minute attempt expiry', () => {
  it('expireAttempt clears every layer and resets to draft with a fresh clock', async () => {
    const store = await load('seller', '6速手排', { attemptStartedAt: NOW - 400_000 })
    await store.saveAnswer('APR-rear', 'normal')
    await store.addEvidence(evidence('APR-rear', { id: 'e1' }))
    await flush()
    vi.setSystemTime(NOW + 5000)
    await store.expireAttempt()
    expect(store.answers).toEqual({})
    expect(store.evidenceByItem).toEqual({})
    expect(localDraftService.loadAnswers('v1')).toEqual([])
    expect(localDraftService.loadEvidence('v1')).toEqual([])
    expect(fs.__paths('verifications/v1/')).toEqual([])
    expect(store.currentVerification).toMatchObject({
      status: 'draft',
      attemptStartedAt: NOW + 5000,
    })
    expect(fs.__get('verifications/v1')).toMatchObject({
      status: 'draft',
      attemptStartedAt: NOW + 5000,
    })
  })
})

describe('list-level actions', () => {
  it('createVerification creates and tolerates a failing refresh (buyer on a seller vehicle)', async () => {
    const store = useVerificationStore()
    fs.__failNext('getDocs')
    const id = await store.createVerification({
      vehicleId: 'veh1',
      userId: 'b1',
      type: 'buyer',
      status: 'draft',
    } as never)
    expect(fs.__get(`verifications/${id}`)).toBeDefined()
  })

  it('deleteVerification removes it from the list and clears the current one', async () => {
    const store = await load()
    await store.fetchByVehicle('veh1')
    expect(store.verifications.map((v) => v.id)).toEqual(['v1'])
    await store.deleteVerification('v1')
    expect(store.verifications).toEqual([])
    expect(store.currentVerification).toBeNull()
  })

  it('saveTransactionDecision / retryAnalysis', async () => {
    const store = await load()
    await store.saveTransactionDecision('v1', 'buy' as never)
    expect(store.currentVerification!.transactionDecision).toBe('buy')
    await store.retryAnalysis('coldCheck')
    await store.retryAnalysis('hotEngineSensorSession')
    expect(fn.calls.map((c) => c.name)).toEqual([
      'analyzeColdEngineTouchCheck',
      'analyzeHotEngineSensorSessionV2',
    ])
  })

  it('every seller item id is reachable through the store', async () => {
    const store = await load()
    const ids = new Set(store.flatItems.map((f) => f.item.id))
    const expected = getFlatItems('seller')
      .filter((f) => !f.item.visibleWhen)
      .map((f) => f.item.id)
    for (const id of expected) expect(ids.has(id), id).toBe(true)
  })
})
