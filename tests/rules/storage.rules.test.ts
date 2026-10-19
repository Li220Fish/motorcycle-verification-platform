import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

import { ADMIN_UID, createEnv } from './helpers'

let env: RulesTestEnvironment
const bytes = new Uint8Array([1, 2, 3])

beforeAll(async () => {
  env = await createEnv()
})
afterAll(async () => {
  await env.cleanup()
})
beforeEach(async () => {
  await env.clearStorage()
})

const as = (uid: string) => env.authenticatedContext(uid).storage()
const anon = () => env.unauthenticatedContext().storage()
const put = (
  s: ReturnType<typeof as>,
  path: string,
  contentType = 'image/jpeg',
): Promise<unknown> => Promise.resolve(s.ref(path).put(bytes, { contentType }))

describe('storage rules', () => {
  it('verification evidence: any signed-in user, never anonymous', async () => {
    await assertSucceeds(put(as('u1'), 'verifications/v1/evidence/a.jpg'))
    await assertFails(put(anon(), 'verifications/v1/evidence/b.jpg'))
  })

  it('marketplace photos are publicly readable', async () => {
    await assertSucceeds(put(as('u1'), 'marketplace/L1/p.jpg'))
    await assertSucceeds(anon().ref('marketplace/L1/p.jpg').getMetadata())
    await assertFails(put(anon(), 'marketplace/L1/q.jpg'))
  })

  it('chat images and avatars: only into your own uid folder', async () => {
    await assertSucceeds(put(as('u1'), 'conversations/c1/u1/m1/image.jpg'))
    await assertFails(put(as('u1'), 'conversations/c1/u2/m1/image.jpg'))
    await assertSucceeds(put(as('u1'), 'users/u1/avatar/a.jpg'))
    await assertFails(put(as('u1'), 'users/u2/avatar/a.jpg'))
  })

  it('vehicle model photos: admin only', async () => {
    await assertFails(put(as('u1'), 'vehicleModels/m1/cover.jpg'))
    await assertSucceeds(put(as(ADMIN_UID), 'vehicleModels/m1/cover.jpg'))
  })

  it('training uploads: own folder, images only, under 20MB', async () => {
    await assertSucceeds(put(as('c1'), 'training/c1/s1/x.jpg'))
    await assertFails(put(as('c1'), 'training/c1/s1/x.txt', 'text/plain'))
    await assertFails(put(as('c1'), 'training/c2/s1/x.jpg'))
    await assertFails(as('c2').ref('training/c1/s1/x.jpg').getMetadata())
  })

  it('vehicle news storage is read-only; unknown paths denied', async () => {
    await assertFails(put(as(ADMIN_UID), 'vehicleNews/n1/a.jpg'))
    await assertFails(put(as('u1'), 'random/a.jpg'))
  })
})
