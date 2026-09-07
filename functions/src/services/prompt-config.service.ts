import { getFirestore } from 'firebase-admin/firestore'
import * as crypto from 'node:crypto'
import { AI_PROMPT_MAP, AI_PROMPT_REGISTRY } from '../ai/prompts/registry'

const PROMPTS_COLLECTION = 'aiPrompts'
const CACHE_TTL_MS = 60_000

interface CacheEntry {
  text: string
  expiresAt: number
}

// Module-level, per-warm-instance only — same "no cross-invocation store
// beyond this" scope as every other in-memory state in functions/src (there
// is no existing warm-instance cache precedent in this codebase; aiCache in
// ai/gemini/cache.ts is a Firestore-backed response cache, not this). A short
// TTL keeps an admin's prompt edit taking effect within a minute without
// requiring a redeploy, while still avoiding a Firestore read on every call.
const cache = new Map<string, CacheEntry>()

/** Short content hash appended to Gemini's cacheDiscriminators (see
 *  ai/gemini/client.ts / ai/gemini/cache.ts) so an admin prompt edit busts
 *  the response cache immediately — the cache key otherwise only hashes
 *  promptVersion (a stable route-name string, e.g. "core-vision-v2"), which
 *  never changes just because an admin edited that route's text. */
export function hashPromptText(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 12)
}

/**
 * Resolves one prompt's live text: an admin override from
 * aiPrompts/{key}.text (see the Admin 後台 Prompt 設定 section) if present
 * and non-empty, otherwise the hardcoded default from the registry.
 */
export async function resolvePromptText(key: string): Promise<string> {
  const definition = AI_PROMPT_MAP.get(key)
  if (!definition) {
    throw new Error(`Unknown AI prompt key: ${key}`)
  }

  const cached = cache.get(key)
  const now = Date.now()
  if (cached && cached.expiresAt > now) return cached.text

  const snap = await getFirestore().collection(PROMPTS_COLLECTION).doc(key).get()
  const override = snap.exists ? (snap.data()?.text as string | undefined) : undefined
  const text = override && override.trim().length > 0 ? override : definition.defaultText

  cache.set(key, { text, expiresAt: now + CACHE_TTL_MS })
  return text
}

export interface AiPromptCatalogEntry {
  key: string
  label: string
  defaultText: string
  overrideText: string | null
  updatedAt: number | null
  updatedBy: string | null
}

/** Backs the admin-only getAiPromptCatalog callable. Always reads Firestore
 *  directly (never the resolvePromptText cache above) since the editor must
 *  show the true current state, not a possibly-stale warm-instance value. */
export async function listAiPromptCatalog(): Promise<AiPromptCatalogEntry[]> {
  const snapshot = await getFirestore().collection(PROMPTS_COLLECTION).get()
  const overrides = new Map(snapshot.docs.map((doc) => [doc.id, doc.data()]))

  return AI_PROMPT_REGISTRY.map((definition) => {
    const override = overrides.get(definition.key)
    const overrideText = (override?.text as string | undefined)?.trim() || null
    return {
      key: definition.key,
      label: definition.label,
      defaultText: definition.defaultText,
      overrideText,
      updatedAt: (override?.updatedAt as number | undefined) ?? null,
      updatedBy: (override?.updatedBy as string | undefined) ?? null,
    }
  })
}
