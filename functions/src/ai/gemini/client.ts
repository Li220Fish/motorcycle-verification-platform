import { GoogleGenAI } from '@google/genai'
import { GEMINI_MODEL } from '../../config'
import { GeminiResponseEnvelope, GeminiSystemError } from '../schemas/common'
import { buildCacheKey, getCached, hashContent, setCached } from './cache'

export interface ImagePart {
  evidenceId: string
  view: string
  base64: string
  mimeType: string
}

export interface AudioPart {
  evidenceId: string
  base64: string
  mimeType: string
}

export interface GeminiJsonCallOptions {
  apiKey: string
  promptText: string
  images?: ImagePart[]
  audio?: AudioPart[]
  responseSchema: Record<string, unknown>
  /** Used only for the cache key — not sent to Gemini. */
  cacheDiscriminators: string[]
  promptVersion: string
}

function isTransient(error: unknown): boolean {
  const status =
    (error as { status?: number; code?: number; httpStatus?: number })?.status ??
    (error as { code?: number })?.code ??
    (error as { httpStatus?: number })?.httpStatus
  if (typeof status === 'number' && (status === 429 || status >= 500)) return true
  const message = (error as Error)?.message?.toLowerCase() ?? ''
  return (
    message.includes('timeout') || message.includes('econnreset') || message.includes('etimedout')
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Single point of contact with Gemini's Interactions API. Handles: cache
 * lookup, the Evidence-marker-before-each-media-part convention, structured
 * output, bounded transport retry (max 2, exponential backoff — infra
 * retry, not a User inspection attempt), and API-error != unsure (throws
 * GeminiSystemError, never fabricates a result). Generic over the response
 * shape so both the {results:[...]} inspection envelope (Group A/B/C/Audio)
 * and OCR's plain {text,confidence} shape share one implementation.
 */
export async function callGeminiJson<T>(options: GeminiJsonCallOptions): Promise<T> {
  // Pairing evidenceId with its content hash (not the bare hash alone)
  // matters: the cached Gemini response's `evidenceIds` field echoes back
  // whatever EVIDENCE_ID markers were in THAT request's prompt text. Two
  // different verifications that happen to reuse visually-identical
  // evidence (e.g. two smoke-test runs against the same fixture photo)
  // would otherwise collide on a bare content hash and return a cached
  // response referencing another verification's evidenceIds — which the
  // validator then correctly rejects as "not part of this request".
  const contentHashes = [
    ...(options.images ?? []).map((image) => `${image.evidenceId}:${hashContent(image.base64)}`),
    ...(options.audio ?? []).map(
      (audioPart) => `${audioPart.evidenceId}:${hashContent(audioPart.base64)}`,
    ),
  ]
  const cacheKey = buildCacheKey({
    contentHashes,
    requestedItemIds: options.cacheDiscriminators,
    promptVersion: options.promptVersion,
    model: GEMINI_MODEL,
  })

  const cached = await getCached(cacheKey)
  if (cached) return cached as T

  const ai = new GoogleGenAI({ apiKey: options.apiKey })

  // The Interactions API's per-part content types (TextContent/ImageContent/
  // AudioContent) are only reachable in @google/genai's bundled .d.ts through
  // an internal `interactions` ambient namespace, not as a clean top-level
  // import — a rough edge in how the package bundles its generated types,
  // not a sign this shape is wrong (verified directly against that same
  // .d.ts's field-level definitions, and against a live call's error message
  // when the shape WAS actually wrong — see the response_format history
  // below). `input`/`response_format` are cast at the call site accordingly.
  interface InteractionContentPart {
    type: 'text' | 'image' | 'audio'
    text?: string
    data?: string
    mime_type?: string
  }
  const input: InteractionContentPart[] = [{ type: 'text', text: options.promptText }]
  for (const image of options.images ?? []) {
    input.push({ type: 'text', text: `EVIDENCE_ID=${image.evidenceId}; VIEW=${image.view}` })
    input.push({ type: 'image', data: image.base64, mime_type: image.mimeType })
  }
  for (const audioPart of options.audio ?? []) {
    input.push({ type: 'text', text: `EVIDENCE_ID=${audioPart.evidenceId}` })
    input.push({ type: 'audio', data: audioPart.base64, mime_type: audioPart.mimeType })
  }

  const maxAttempts = 3 // 1 initial + 2 transport retries (spec §38/§41 — max retry = 2)
  let lastError: unknown

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const interaction = await ai.interactions.create({
        model: GEMINI_MODEL,
        // Verified against the installed @google/genai@2.x's own .d.ts (the
        // 1.x line — what was actually installed the first time this was
        // written — used a different, now-legacy shape that a live call
        // rejected outright with "legacy Interactions API schema is no
        // longer supported"; response_mime_type is `@deprecated` in 2.x).
        input,
        response_format: {
          type: 'text',
          mime_type: 'application/json',
          schema: options.responseSchema,
        },
        generation_config: { thinking_level: 'low' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)

      const outputText = interaction.output_text

      if (!outputText) {
        throw new GeminiSystemError('GEMINI_EMPTY_RESPONSE')
      }

      let parsed: T
      try {
        parsed = JSON.parse(outputText)
      } catch {
        throw new GeminiSystemError('GEMINI_INVALID_JSON')
      }
      if (!parsed) {
        throw new GeminiSystemError('GEMINI_MALFORMED_ENVELOPE')
      }

      await setCached(cacheKey, parsed as unknown as GeminiResponseEnvelope)
      return parsed
    } catch (error) {
      lastError = error
      if (error instanceof GeminiSystemError) throw error
      if (!isTransient(error) || attempt === maxAttempts - 1) {
        throw new GeminiSystemError(
          `GEMINI_CALL_FAILED: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
      await sleep(2 ** attempt * 500)
    }
  }

  throw new GeminiSystemError(
    `GEMINI_CALL_FAILED: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  )
}

export interface GeminiInspectionCallOptions {
  apiKey: string
  promptText: string
  images?: ImagePart[]
  audio?: AudioPart[]
  responseSchema: Record<string, unknown>
  requestedItemIds: string[]
  promptVersion: string
}

/** Thin wrapper enforcing the `{results:[...]}` envelope shape used by every
 *  Group A/B/C and Audio inspection call — see each provider in
 *  ai/providers/. */
export async function callGeminiInspection(
  options: GeminiInspectionCallOptions,
): Promise<GeminiResponseEnvelope> {
  const envelope = await callGeminiJson<GeminiResponseEnvelope>({
    apiKey: options.apiKey,
    promptText: options.promptText,
    images: options.images,
    audio: options.audio,
    responseSchema: options.responseSchema,
    cacheDiscriminators: options.requestedItemIds,
    promptVersion: options.promptVersion,
  })
  if (!Array.isArray(envelope.results)) {
    throw new GeminiSystemError('GEMINI_MALFORMED_ENVELOPE')
  }
  return envelope
}
