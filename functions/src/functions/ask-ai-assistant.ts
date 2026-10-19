import { GoogleGenAI } from '@google/genai'
import { getStorage } from 'firebase-admin/storage'
import { HttpsError, onCall } from 'firebase-functions/v2/https'

import { GEMINI_API_KEY_SECRET, GEMINI_MODEL } from '../config'
import { assertCanAnalyze } from '../services/auth.service'

/**
 * 買家複驗的 AI 詢問小視窗 (src/components/verification/ai-chat/) — a plain
 * multi-turn chat: the user's own text and optional photo go to Gemini as-is,
 * with NO system prompt or added instructions (product decision — "不用另外加
 * prompt"). Stateless: the client sends the visible conversation each time;
 * nothing is stored server-side.
 */

export interface AiChatTurn {
  role: 'user' | 'model'
  text: string
  /** Either inline (a photo picked inside the chat), or a verification
   *  evidence photo already in Storage (the "詢問 AI" button on a captured
   *  check photo) — resolved server-side after an ownership check. */
  image?: { base64: string; mimeType: string } | { storagePath: string }
}

const EVIDENCE_PATH = /^verifications\/([^/]+)\/evidence\/[^/]+$/

/** Replaces every `{storagePath}` image with its downloaded bytes, after
 *  checking the caller may read that verification (same owner/admin model
 *  as every analyze route). */
export async function resolveStorageImages(
  data: unknown,
  uid: string,
  deps: {
    assertCanRead: (verificationId: string, uid: string) => Promise<unknown>
    download: (path: string) => Promise<Buffer>
  },
): Promise<unknown> {
  const turns = (data as { turns?: AiChatTurn[] })?.turns
  if (!Array.isArray(turns)) return data
  const checked = new Set<string>()
  const resolved = await Promise.all(
    turns.map(async (turn) => {
      const image = turn?.image as { storagePath?: unknown } | undefined
      if (!image || typeof image.storagePath !== 'string') return turn
      const match = EVIDENCE_PATH.exec(image.storagePath)
      if (!match) throw new HttpsError('invalid-argument', 'Unsupported image path.')
      if (!checked.has(match[1])) {
        await deps.assertCanRead(match[1], uid)
        checked.add(match[1])
      }
      const buffer = await deps.download(image.storagePath)
      return { ...turn, image: { base64: buffer.toString('base64'), mimeType: 'image/jpeg' } }
    }),
  )
  return { ...(data as object), turns: resolved }
}

export const MAX_TEXT_CHARS = 2000
export const MAX_TURNS = 20
/** Total base64 across every image in one request — keeps the callable well
 *  under its 10MB request limit. Older images are dropped first. */
export const MAX_IMAGE_BASE64_TOTAL = 6_000_000
const IMAGE_MIME = /^image\/(jpeg|png|webp|heic|heif)$/

/** Validates and trims the client payload into Gemini `contents`. Throws
 *  HttpsError('invalid-argument') on anything malformed. */
export function buildChatContents(data: unknown) {
  const turns = (data as { turns?: unknown })?.turns
  if (!Array.isArray(turns) || turns.length === 0) {
    throw new HttpsError('invalid-argument', 'turns is required')
  }
  const recent = (turns as AiChatTurn[]).slice(-MAX_TURNS)
  if (recent[recent.length - 1]?.role !== 'user') {
    throw new HttpsError('invalid-argument', 'The last turn must be from the user.')
  }

  // Keep the newest images within the size budget; older ones become text-only.
  let budget = MAX_IMAGE_BASE64_TOTAL
  const keepImage = new Set<number>()
  for (let i = recent.length - 1; i >= 0; i--) {
    const image = recent[i]?.image as { base64: string; mimeType: string } | undefined
    if (!image) continue
    if (typeof image.base64 !== 'string' || !IMAGE_MIME.test(image.mimeType ?? '')) {
      throw new HttpsError('invalid-argument', 'Unsupported image.')
    }
    if (image.base64.length <= budget) {
      budget -= image.base64.length
      keepImage.add(i)
    }
  }
  if (recent[recent.length - 1].image && !keepImage.has(recent.length - 1)) {
    throw new HttpsError('invalid-argument', 'Image is too large.')
  }

  return recent.map((turn, i) => {
    if (turn.role !== 'user' && turn.role !== 'model') {
      throw new HttpsError('invalid-argument', 'Invalid role.')
    }
    const text = typeof turn.text === 'string' ? turn.text.slice(0, MAX_TEXT_CHARS) : ''
    const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = []
    const image = turn.image as { base64: string; mimeType: string } | undefined
    if (keepImage.has(i) && image) {
      parts.push({ inlineData: { data: image.base64, mimeType: image.mimeType } })
    }
    if (text.trim()) parts.push({ text })
    if (parts.length === 0) throw new HttpsError('invalid-argument', 'Empty message.')
    return { role: turn.role, parts }
  })
}

export const askAiAssistant = onCall(
  { secrets: [GEMINI_API_KEY_SECRET], memory: '512MiB', timeoutSeconds: 120 },
  async (request) => {
    const auth = request.auth
    if (!auth || auth.token.firebase?.sign_in_provider === 'anonymous') {
      throw new HttpsError('unauthenticated', 'Sign in to use the AI assistant.')
    }
    const data = await resolveStorageImages(request.data, auth.uid, {
      assertCanRead: assertCanAnalyze,
      download: async (path) => (await getStorage().bucket().file(path).download())[0],
    })
    const contents = buildChatContents(data)
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string })
    try {
      const response = await ai.models.generateContent({ model: GEMINI_MODEL, contents })
      const text = response.text?.trim()
      if (!text) throw new HttpsError('unavailable', 'The AI returned no answer.')
      return { text }
    } catch (error) {
      if (error instanceof HttpsError) throw error
      console.error('[askAiAssistant] Gemini call failed:', error)
      throw new HttpsError('unavailable', 'The AI is not available right now.')
    }
  },
)
