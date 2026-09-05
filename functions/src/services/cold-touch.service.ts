import { getFirestore } from 'firebase-admin/firestore'
import { GEMINI_MODEL } from '../config'
import {
  COLD_ENGINE_TOUCH_ITEM_ID,
  COLD_ENGINE_TOUCH_PROMPT,
  COLD_ENGINE_TOUCH_PROMPT_VERSION,
  COLD_ENGINE_TOUCH_SCHEMA,
  ColdEngineTouchResult,
} from '../ai/prompts/cold-engine-touch-v2'
import { GeminiItemResult, InvalidAiResponseError, RESULT_VALUES } from '../ai/schemas/common'
import { callGeminiJson, ImagePart } from '../ai/gemini/client'
import { extractFrames, probeDurationMs } from '../video/video-tools'
import { resolveVideoEvidence, resolveVideoEvidenceById, ResolvedVideoEvidence } from './evidence.service'
import { assertRetryEligible, getAnswer, writeAiAnswer } from './answer-writer.service'

const ENG_02 = 'ENG-02' // stable existing Answer doc id (see engine-sensor-session.service.ts's
// ENG-03..08 reconciliation comment for why the semantic id stays metadata-only)
const STARTUP_ITEM_ID = 'ENG-03'

interface ColdTouchMetadata {
  sessionType?: string
  recordingStartedAtMs?: number
  contactWindowStartMs?: number
  contactWindowEndMs?: number
  recordingEndedAtMs?: number
}

/** Spec §19/§29: once Startup has been answered, the cold-state原始狀態 has
 *  already been disturbed — Step 39 can never be (re)analyzed after that,
 *  first pass or retry. This is the one integrity guarantee actually
 *  enforced server-side (the client has no matching "can't go back"
 *  edit-lock for ANY item today, so the Trusted Backend re-checking this
 *  itself, rather than trusting client navigation state, is what actually
 *  holds here). */
async function assertStartupNotYetBegun(verificationId: string): Promise<void> {
  const existing = await getAnswer(verificationId, STARTUP_ITEM_ID)
  if (existing) {
    throw new Error(
      'Startup has already begun for this verification — Step 39 cold-state check can no longer be performed or redone.',
    )
  }
}

function contactWindowFrameTimestamps(metadata: ColdTouchMetadata, durationMs: number): number[] {
  const start = metadata.contactWindowStartMs ?? 0
  const end = metadata.contactWindowEndMs ?? durationMs
  const timestamps: number[] = []
  const before = Math.max(0, start - 500)
  timestamps.push(before)
  for (let t = start; t <= end; t += 500) timestamps.push(Math.min(t, durationMs))
  const after = Math.min(durationMs, end + 500)
  timestamps.push(after)
  return timestamps
}

async function callGeminiColdTouch(params: {
  apiKey: string
  promptText: string
  promptVersion: string
  images: ImagePart[]
}): Promise<ColdEngineTouchResult> {
  const result = await callGeminiJson<ColdEngineTouchResult>({
    apiKey: params.apiKey,
    promptText: params.promptText,
    images: params.images,
    responseSchema: COLD_ENGINE_TOUCH_SCHEMA,
    cacheDiscriminators: [params.promptVersion, ...params.images.map((image) => image.evidenceId)],
    promptVersion: params.promptVersion,
  })
  if (!RESULT_VALUES.includes(result.result)) {
    throw new InvalidAiResponseError(`Invalid result enum "${result.result}"`)
  }
  if (result.result !== 'normal' && !result.note?.trim()) {
    throw new InvalidAiResponseError('Non-normal result requires a note')
  }
  return result
}

async function writeColdTouchAnswer(params: {
  verificationId: string
  video: ResolvedVideoEvidence
  gemini: ColdEngineTouchResult
  attempt: 1 | 2
  existing?: Awaited<ReturnType<typeof getAnswer>>
}): Promise<GeminiItemResult> {
  const coldStateValid = params.gemini.result === 'normal'
  const item: GeminiItemResult = {
    itemId: ENG_02,
    result: params.gemini.result,
    confidence: params.gemini.confidence,
    label: params.gemini.label,
    note: params.gemini.note,
    evidenceIds: [params.video.evidenceId],
    problematicEvidenceIds: [],
    retakeInstruction: null,
    details: {
      semanticItemId: COLD_ENGINE_TOUCH_ITEM_ID,
      contactVisible: params.gemini.contactVisible,
      contactMaintainedFullWindow: params.gemini.contactMaintainedFullWindow,
      targetAreaVisible: params.gemini.targetAreaVisible,
      coldStateValid,
    },
  }
  await writeAiAnswer({
    verificationId: params.verificationId,
    item,
    modelId: GEMINI_MODEL,
    modelVersion: GEMINI_MODEL,
    analysisType: 'vision',
    promptVersion: {
      global: 'n/a',
      group: COLD_ENGINE_TOUCH_PROMPT_VERSION,
      retry: params.attempt === 2 ? COLD_ENGINE_TOUCH_PROMPT_VERSION : null,
    },
    attempt: params.attempt,
    existing: params.existing,
  })

  await getFirestore()
    .collection('verifications')
    .doc(params.verificationId)
    .set(
      {
        coldStateContext: {
          coldEngineTouchCheck: params.gemini.result,
          coldStateValid,
          performedBeforeStartup: true,
          analysisVersion: COLD_ENGINE_TOUCH_PROMPT_VERSION,
        },
      },
      { merge: true },
    )

  return item
}

/** Backend-decided invalid with zero Gemini cost (spec §28: "如果 contact
 *  window 明確不到 5 秒，Backend 可直接 cold_state=invalid") — here that
 *  means the actual recorded video doesn't even cover the app-timed contact
 *  window (an interrupted/truncated recording), not a user-chosen short
 *  duration (the window itself is always exactly app-timed, never
 *  user-editable, per spec §21). */
function recordingCoversWindow(metadata: ColdTouchMetadata, actualDurationMs: number): boolean {
  const end = metadata.contactWindowEndMs
  if (end === undefined) return true
  return actualDurationMs >= end - 200 // small tolerance for encoder/container rounding
}

export async function analyzeColdEngineTouch(params: {
  verificationId: string
  apiKey: string
}): Promise<GeminiItemResult> {
  await assertStartupNotYetBegun(params.verificationId)

  const video = await resolveVideoEvidence(params.verificationId, ENG_02)
  const metadata = video.metadata as ColdTouchMetadata
  const durationMs = await probeDurationMs(video.buffer)

  if (!recordingCoversWindow(metadata, durationMs)) {
    const gemini: ColdEngineTouchResult = {
      result: 'attention',
      confidence: null,
      label: 'cold_state_requirement_failed',
      note: '未完成完整 5 秒冷車觸碰程序，本次不符合 MotoVerify 冷車採集條件。',
      contactVisible: false,
      contactMaintainedFullWindow: false,
      targetAreaVisible: false,
    }
    return writeColdTouchAnswer({ verificationId: params.verificationId, video, gemini, attempt: 1 })
  }

  const timestamps = contactWindowFrameTimestamps(metadata, durationMs)
  const frames = await extractFrames(video.buffer, timestamps)
  const images: ImagePart[] = frames.map((frame, index) => ({
    evidenceId: `${video.evidenceId}_frame_${index}`,
    view: 'cold_touch_frame',
    base64: frame.toString('base64'),
    mimeType: 'image/jpeg',
  }))

  const gemini = await callGeminiColdTouch({
    apiKey: params.apiKey,
    promptText: COLD_ENGINE_TOUCH_PROMPT,
    promptVersion: COLD_ENGINE_TOUCH_PROMPT_VERSION,
    images,
  })

  return writeColdTouchAnswer({ verificationId: params.verificationId, video, gemini, attempt: 1 })
}

/** Retry: only while the current result is `unsure` (evidence-quality
 *  issue, spec §29) — `attention` means the procedure genuinely wasn't
 *  completed and is never eligible for a "bad photo" retry. Still gated by
 *  the same Startup-not-yet-begun guard. */
export async function retryColdEngineTouch(params: {
  verificationId: string
  apiKey: string
  newEvidenceId: string
}): Promise<GeminiItemResult> {
  await assertStartupNotYetBegun(params.verificationId)

  const existing = await getAnswer(params.verificationId, ENG_02)
  assertRetryEligible(existing)

  const video = await resolveVideoEvidenceById(params.verificationId, params.newEvidenceId)
  if (video.itemId !== ENG_02) {
    throw new Error(`newEvidenceId does not belong to item ${ENG_02}`)
  }
  const metadata = video.metadata as ColdTouchMetadata
  const durationMs = await probeDurationMs(video.buffer)

  if (!recordingCoversWindow(metadata, durationMs)) {
    const gemini: ColdEngineTouchResult = {
      result: 'attention',
      confidence: null,
      label: 'cold_state_requirement_failed',
      note: '未完成完整 5 秒冷車觸碰程序，本次不符合 MotoVerify 冷車採集條件。',
      contactVisible: false,
      contactMaintainedFullWindow: false,
      targetAreaVisible: false,
    }
    return writeColdTouchAnswer({
      verificationId: params.verificationId,
      video,
      gemini,
      attempt: 2,
      existing,
    })
  }

  const timestamps = contactWindowFrameTimestamps(metadata, durationMs)
  const frames = await extractFrames(video.buffer, timestamps)
  const images: ImagePart[] = frames.map((frame, index) => ({
    evidenceId: `${video.evidenceId}_frame_${index}`,
    view: 'cold_touch_frame',
    base64: frame.toString('base64'),
    mimeType: 'image/jpeg',
  }))

  const gemini = await callGeminiColdTouch({
    apiKey: params.apiKey,
    promptText: `${COLD_ENGINE_TOUCH_PROMPT}\n\nThis is the second and final verification attempt. Do not request another retake.`,
    promptVersion: COLD_ENGINE_TOUCH_PROMPT_VERSION,
    images,
  })

  return writeColdTouchAnswer({
    verificationId: params.verificationId,
    video,
    gemini,
    attempt: 2,
    existing,
  })
}
