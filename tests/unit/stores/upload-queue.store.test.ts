import { Preferences } from '@capacitor/preferences'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/media/image-compression.service', () => ({
  imageCompressionService: {
    compressImage: vi.fn(async (b: Blob) => ({
      blob: new Blob(['compressed:', b]),
      width: 1,
      height: 1,
    })),
  },
}))

import { MAX_RETRY_COUNT, RETRY_BACKOFF_MS, retryDelayFor } from '@/config/imageUpload.config'
import { imageCompressionService } from '@/services/media/image-compression.service'
import { useUploadQueueStore } from '@/stores/upload-queue.store'
import * as fs from '../fakes/firestore'
import * as st from '../fakes/storage'

const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve()
}

beforeEach(() => {
  vi.stubGlobal(
    'URL',
    Object.assign(URL, { createObjectURL: () => 'blob:local/1', revokeObjectURL: vi.fn() }),
  )
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ blob: async () => new Blob(['raw']) })),
  )
  fs.__seed('verifications/v1/evidence/e1', { id: 'e1' })
  fs.__seed('verifications/v1/evidence/a1', { id: 'a1' })
})
afterEach(async () => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  await Preferences.clear()
})

describe('retry config', () => {
  it('backoff repeats its last value', () => {
    expect(retryDelayFor(0)).toBe(RETRY_BACKOFF_MS[0])
    expect(retryDelayFor(99)).toBe(RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1])
  })
})

describe('upload queue', () => {
  it('photo: compress → upload → patch remoteUrl on the evidence doc → uploaded', async () => {
    const store = useUploadQueueStore()
    await store.enqueue({
      localId: 'e1',
      verificationId: 'v1',
      itemId: 'APR-rear',
      type: 'photo',
      blob: new Blob(['x']),
      extension: 'jpg',
    })
    await vi.waitFor(() => expect(store.statusFor('e1')).toBe('uploaded'))
    expect(imageCompressionService.compressImage).toHaveBeenCalled()
    const remoteUrl = fs.__get('verifications/v1/evidence/e1')!.remoteUrl as string
    expect(remoteUrl).toMatch(/^verifications\/v1\/evidence\/\d+-APR-rear\.jpg$/)
    expect(st.__has(remoteUrl)).toBe(true)
    expect(store.isSettled('e1')).toBe(true)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local/1')
    // persisted for the next app session
    const saved = JSON.parse((await Preferences.get({ key: 'motoverify:uploadQueue' })).value!)
    expect(saved.e1.uploadStatus).toBe('uploaded')
  })

  it('audio is uploaded as-is (no compression)', async () => {
    vi.mocked(imageCompressionService.compressImage).mockClear()
    const store = useUploadQueueStore()
    await store.enqueue({
      localId: 'a1',
      verificationId: 'v1',
      itemId: 'ENG-03',
      type: 'audio',
      blob: new Blob(['a']),
      extension: 'm4a',
    })
    await vi.waitFor(() => expect(store.statusFor('a1')).toBe('uploaded'))
    expect(imageCompressionService.compressImage).not.toHaveBeenCalled()
  })

  it('failures retry with backoff, then stay failed until a manual retry', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] })
    const store = useUploadQueueStore()
    for (let i = 0; i <= MAX_RETRY_COUNT; i++) st.__failNext('uploadBytes')
    // __failNext only holds one pending failure — re-arm after each attempt.
    let attempts = 0
    const realFail = st.__failNext
    await store.enqueue({
      localId: 'e1',
      verificationId: 'v1',
      itemId: 'APR-rear',
      type: 'audio',
      blob: new Blob(['x']),
      extension: 'm4a',
    })
    await flush()
    expect(store.statusFor('e1')).toBe('failed')
    expect(store.entries.e1.retryCount).toBe(1)
    for (const delay of RETRY_BACKOFF_MS) {
      realFail('uploadBytes')
      attempts++
      await vi.advanceTimersByTimeAsync(delay)
      await flush()
    }
    expect(attempts).toBe(MAX_RETRY_COUNT)
    expect(store.entries.e1.retryCount).toBe(MAX_RETRY_COUNT + 1)
    expect(store.statusFor('e1')).toBe('failed')
    await vi.advanceTimersByTimeAsync(60_000)
    expect(store.statusFor('e1')).toBe('failed') // no more automatic retries

    store.retry('e1')
    await vi.runAllTimersAsync()
    await flush()
    expect(store.statusFor('e1')).toBe('uploaded')
    expect(store.entries.e1.retryCount).toBe(0)
  })

  it('hydrate resumes unfinished uploads from a previous session', async () => {
    await Preferences.set({
      key: 'motoverify:uploadQueue',
      value: JSON.stringify({
        e1: {
          localId: 'e1',
          verificationId: 'v1',
          itemId: 'APR-rear',
          type: 'audio',
          localUri: 'blob:old',
          extension: 'm4a',
          uploadStatus: 'uploading',
          retryCount: 0,
          createdAt: 1,
        },
        done: {
          localId: 'done',
          verificationId: 'v1',
          itemId: 'X',
          type: 'audio',
          localUri: 'blob:x',
          extension: 'm4a',
          uploadStatus: 'uploaded',
          retryCount: 0,
          createdAt: 1,
        },
      }),
    })
    const store = useUploadQueueStore()
    await store.hydrate()
    await vi.waitFor(() => expect(store.statusFor('e1')).toBe('uploaded'))
    expect(store.statusFor('done')).toBe('uploaded')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('corrupt persisted queue starts empty; unknown ids report undefined', async () => {
    await Preferences.set({ key: 'motoverify:uploadQueue', value: '{not json' })
    const store = useUploadQueueStore()
    await store.hydrate()
    expect(store.entries).toEqual({})
    expect(store.statusFor('nope')).toBeUndefined()
    store.retry('nope') // no-op
  })

  it('going back online re-processes pending/failed entries', async () => {
    const store = useUploadQueueStore()
    st.__failNext('uploadBytes')
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    await store.enqueue({
      localId: 'e1',
      verificationId: 'v1',
      itemId: 'APR-rear',
      type: 'audio',
      blob: new Blob(['x']),
      extension: 'm4a',
    })
    await flush()
    expect(store.statusFor('e1')).toBe('failed')
    window.dispatchEvent(new Event('online'))
    vi.useRealTimers()
    await vi.waitFor(() => expect(store.statusFor('e1')).toBe('uploaded'))
  })
})
