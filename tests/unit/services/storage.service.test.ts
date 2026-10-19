import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { storageService } from '@/services/firebase/storage.service'
import * as st from '../fakes/storage'

const blob = new Blob(['x'])

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(1_700_000_000_000)
})
afterEach(() => vi.useRealTimers())

describe('storageService', () => {
  it('public uploads return a download URL', async () => {
    const url = await storageService.uploadFileAtPath('marketplace/a.jpg', blob)
    expect(url).toContain('/o/marketplace%2Fa.jpg')
    expect(st.__has('marketplace/a.jpg')).toBe(true)
  })

  it('private uploads return the object PATH, never a tokenized URL', async () => {
    expect(await storageService.uploadPrivateFile('private/a.jpg', blob)).toBe('private/a.jpg')
  })

  it('resolveDownloadUrl resolves a stored path and rejects a missing one', async () => {
    st.__put('p/x.jpg')
    await expect(storageService.resolveDownloadUrl('p/x.jpg')).resolves.toContain('p%2Fx.jpg')
    await expect(storageService.resolveDownloadUrl('p/none.jpg')).rejects.toThrow()
  })

  it('builds the documented path for each upload kind', async () => {
    const ts = 1_700_000_000_000
    expect(await storageService.uploadEvidenceFile('v1', 'APR-rear', blob, 'jpg')).toBe(
      `verifications/v1/evidence/${ts}-APR-rear.jpg`,
    )
    expect(await storageService.uploadChatImage('c1', 'u1', 'm1', blob)).toBe(
      'conversations/c1/u1/m1/image.jpg',
    )
    await storageService.uploadDiscussionImage('p1', 'i1', blob)
    await storageService.uploadVehiclePhoto('veh1', blob, 'png')
    await storageService.uploadVehicleRegistrationDocument('veh1', blob, 'jpg')
    await storageService.uploadVehicleModelPhoto('m1', blob)
    await storageService.uploadAvatar('u1', blob)
    expect(st.__paths()).toEqual(
      [
        `verifications/v1/evidence/${ts}-APR-rear.jpg`,
        'conversations/c1/u1/m1/image.jpg',
        'discussion/p1/i1.jpg',
        `vehicles/veh1/photos/${ts}-photo.png`,
        `vehicles/veh1/registration/${ts}-document.jpg`,
        `vehicleModels/m1/${ts}-cover.jpg`,
        `users/u1/avatar/${ts}-avatar.jpg`,
      ].sort(),
    )
  })

  it('deleteFileAtUrl deletes by URL or path and swallows "already gone"', async () => {
    const url = await storageService.uploadFileAtPath('marketplace/b.jpg', blob)
    await storageService.deleteFileAtUrl(url)
    expect(st.__has('marketplace/b.jpg')).toBe(false)
    await expect(storageService.deleteFileAtUrl(url)).resolves.toBeUndefined()
  })

  it('deleteFileAtUrl rethrows other errors', async () => {
    st.__put('x.jpg')
    st.__failNext(
      'deleteObject',
      Object.assign(new Error('nope'), { code: 'storage/unauthorized' }),
    )
    await expect(storageService.deleteFileAtUrl('x.jpg')).rejects.toThrow('nope')
  })
})
