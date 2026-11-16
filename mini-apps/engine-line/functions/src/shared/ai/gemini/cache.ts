import * as crypto from 'node:crypto'
import { getFirestore } from 'firebase-admin/firestore'
import { GeminiResponseEnvelope } from '../schemas/common'

/**
 * SHA-256(image/audio hashes + requestedItems + promptVersion + model) cache
 * — every Group spec's §Cache section asks for this so re-running the same
 * fixture during Agent E2E testing doesn't re-bill Gemini. Cache is a plain
 * lookup, never a substitute for the real Firestore Answer.
 */
export interface CacheKeyInput {
  contentHashes: string[]
  requestedItemIds: string[]
  promptVersion: string
  model: string
}

export function buildCacheKey(input: CacheKeyInput): string {
  const hash = crypto.createHash('sha256')
  hash.update(JSON.stringify([...input.contentHashes].sort()))
  hash.update(JSON.stringify([...input.requestedItemIds].sort()))
  hash.update(input.promptVersion)
  hash.update(input.model)
  return hash.digest('hex')
}

export function hashContent(base64: string): string {
  return crypto.createHash('sha256').update(base64).digest('hex')
}

const CACHE_COLLECTION = 'aiCache'

export async function getCached(key: string): Promise<GeminiResponseEnvelope | null> {
  const snap = await getFirestore().collection(CACHE_COLLECTION).doc(key).get()
  if (!snap.exists) return null
  const data = snap.data()
  return (data?.response as GeminiResponseEnvelope) ?? null
}

export async function setCached(key: string, response: GeminiResponseEnvelope): Promise<void> {
  await getFirestore().collection(CACHE_COLLECTION).doc(key).set({ response, cachedAt: Date.now() })
}
