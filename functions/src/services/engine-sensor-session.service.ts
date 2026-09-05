import { getFirestore } from 'firebase-admin/firestore'
import { GEMINI_MODEL } from '../config'
import {
  ENGINE_AUDIO_GLOBAL_PROMPT,
  ENGINE_AUDIO_GLOBAL_PROMPT_VERSION,
} from '../ai/prompts/audio/engine-audio-global-v1'
import {
  STARTUP_AUDIO_ITEM_IDS,
  STARTUP_AUDIO_PROMPT,
  STARTUP_AUDIO_PROMPT_VERSION,
} from '../ai/prompts/audio/startup-audio-v1'
import {
  IDLE_AUDIO_ITEM_IDS,
  IDLE_AUDIO_PROMPT,
  IDLE_AUDIO_PROMPT_VERSION,
} from '../ai/prompts/audio/idle-audio-v1'
import {
  REV_AUDIO_ITEM_IDS,
  REV_AUDIO_PROMPT,
  REV_AUDIO_PROMPT_VERSION,
} from '../ai/prompts/audio/rev-audio-v1'
import { GeminiItemResult } from '../ai/schemas/common'
import { validateGeminiResults } from '../ai/validator'
import { AudioInspectionProvider } from '../ai/providers/audio-inspection-provider'
import { resolveAudioEvidence, resolveImuEvidence } from './evidence.service'
import { writeAiAnswer } from './answer-writer.service'
import { ImuSessionJson, preprocessImu } from '../imu/imu-preprocessor'
import { extractImuFeatures, IMU_FEATURES_VERSION } from '../imu/imu-feature-extractor'
import {
  classifyIdleStability,
  classifyRevStability,
  IMU_STABILITY_VERSION,
} from '../imu/imu-stability-classifier'

/**
 * ENG-03..08 are this project's EXISTING checklist itemIds (see
 * src/data/verification/seller-verification.ts, and the 3-session capture
 * UI built earlier this pass — src/components/verification/engine/
 * EngineInspectionFlow.vue). The routing map's semantic ids
 * (starter_motor_sound, engine_idle_sound, ...) are the spec's "stable
 * business key" concept (§63-64), but rekeying the Answer documents to them
 * would break the already-shipped lockedOrder gate / Review missing-items /
 * Report grouping, all of which already read/write these exact ENG-* ids.
 * Reconciliation: keep ENG-* as the actual Answer doc id (unchanged
 * integration surface), record the semantic id as
 * `aiResult.details.semanticItemId` for traceability, and use the semantic
 * names only in the Gemini-facing prompt/schema layer, matching the intent
 * (a durable identifier independent of UI step numbers) without a breaking
 * schema migration.
 */
const STARTUP_ENG_IDS = ['ENG-03', 'ENG-04'] as const // starter_motor_sound, start_smoothness
const IDLE_AUDIO_ENG_ID = 'ENG-05' // engine_idle_sound
const IDLE_IMU_ENG_ID = 'ENG-07' // idle_stability
const REV_AUDIO_ENG_ID = 'ENG-06' // engine_rev_sound
const REV_IMU_ENG_ID = 'ENG-08' // rev_stability

const SEMANTIC_ITEM_ID: Record<string, string> = {
  'ENG-03': 'starter_motor_sound',
  'ENG-04': 'start_smoothness',
  'ENG-05': 'engine_idle_sound',
  'ENG-06': 'engine_rev_sound',
  'ENG-07': 'idle_stability',
  'ENG-08': 'rev_stability',
}

function withSemanticId(
  item: GeminiItemResult,
  engId: string,
  coldStateValid: boolean,
): GeminiItemResult {
  return {
    ...item,
    details: { ...(item.details ?? {}), semanticItemId: SEMANTIC_ITEM_ID[engId], coldStateValid },
  }
}

/** Environment/Cold-State spec §34: every Startup/Idle/Rev answer records
 *  whether Step 39's cold-state procedure was actually verified complete —
 *  this project's chosen policy (vs. the spec's stricter alternative) is to
 *  let the user continue past a failed Step 39 rather than hard-block
 *  Startup, but the resulting data must never be silently presented as a
 *  valid cold-start baseline. Missing coldStateContext (Step 39 not yet
 *  analyzed/skipped) reads conservatively as `false`, never assumed valid. */
async function getColdStateValid(verificationId: string): Promise<boolean> {
  const snap = await getFirestore().collection('verifications').doc(verificationId).get()
  return (snap.data()?.coldStateContext?.coldStateValid as boolean | undefined) ?? false
}

export async function analyzeEngineStartup(params: {
  verificationId: string
  apiKey: string
  provider: AudioInspectionProvider
}): Promise<GeminiItemResult[]> {
  const coldStateValid = await getColdStateValid(params.verificationId)
  const audio = await resolveAudioEvidence(params.verificationId, STARTUP_ENG_IDS[0])
  const promptText = `${ENGINE_AUDIO_GLOBAL_PROMPT}\n\n${STARTUP_AUDIO_PROMPT}`

  const results = await params.provider.analyze({
    apiKey: params.apiKey,
    promptText,
    promptVersion: STARTUP_AUDIO_PROMPT_VERSION,
    audio,
    requestedItemIds: [...STARTUP_AUDIO_ITEM_IDS],
  })
  validateGeminiResults(results, {
    requestedItemIds: [...STARTUP_AUDIO_ITEM_IDS],
    attempt: 1,
    validEvidenceIds: new Set([audio.evidenceId]),
  })

  // starter_motor_sound -> ENG-03, start_smoothness -> ENG-04, by position
  // in STARTUP_AUDIO_ITEM_IDS (both frozen, order-stable per spec).
  for (let i = 0; i < STARTUP_AUDIO_ITEM_IDS.length; i++) {
    const semanticId = STARTUP_AUDIO_ITEM_IDS[i]
    const engId = STARTUP_ENG_IDS[i]
    const item = results.find((r) => r.itemId === semanticId)
    if (!item) continue
    await writeAiAnswer({
      verificationId: params.verificationId,
      item: { ...withSemanticId(item, engId, coldStateValid), itemId: engId },
      modelId: GEMINI_MODEL,
      modelVersion: GEMINI_MODEL,
      analysisType: 'audio',
      promptVersion: {
        global: ENGINE_AUDIO_GLOBAL_PROMPT_VERSION,
        group: STARTUP_AUDIO_PROMPT_VERSION,
        retry: null,
      },
      attempt: 1,
    })
  }
  return results
}

async function analyzeSingleAudioItem(params: {
  verificationId: string
  apiKey: string
  provider: AudioInspectionProvider
  audioEngId: string
  semanticItemIds: readonly string[]
  promptText: string
  promptVersion: string
  coldStateValid: boolean
}): Promise<GeminiItemResult> {
  const audio = await resolveAudioEvidence(params.verificationId, params.audioEngId)
  const results = await params.provider.analyze({
    apiKey: params.apiKey,
    promptText: params.promptText,
    promptVersion: params.promptVersion,
    audio,
    requestedItemIds: [...params.semanticItemIds],
  })
  validateGeminiResults(results, {
    requestedItemIds: [...params.semanticItemIds],
    attempt: 1,
    validEvidenceIds: new Set([audio.evidenceId]),
  })
  const item = results[0]
  await writeAiAnswer({
    verificationId: params.verificationId,
    item: {
      ...withSemanticId(item, params.audioEngId, params.coldStateValid),
      itemId: params.audioEngId,
    },
    modelId: GEMINI_MODEL,
    modelVersion: GEMINI_MODEL,
    analysisType: 'audio',
    promptVersion: {
      global: ENGINE_AUDIO_GLOBAL_PROMPT_VERSION,
      group: params.promptVersion,
      retry: null,
    },
    attempt: 1,
  })
  return item
}

async function analyzeImuItem(params: {
  verificationId: string
  imuEngId: string
  sessionType: 'idle' | 'rev'
  coldStateValid: boolean
}): Promise<{ result: string; note: string | null }> {
  const { json } = await resolveImuEvidence(params.verificationId, params.imuEngId)
  const raw = json as ImuSessionJson
  const preprocessed = preprocessImu(raw)
  const features = extractImuFeatures(preprocessed, raw.durationMs)
  const classification =
    params.sessionType === 'idle' ? classifyIdleStability(features) : classifyRevStability(features)

  const item: GeminiItemResult = {
    itemId: params.imuEngId,
    result: classification.result,
    confidence: null,
    label: classification.result === 'attention' ? 'unstable_vibration' : 'stable_signal',
    note: classification.note,
    evidenceIds: [],
    problematicEvidenceIds: [],
    retakeInstruction: null,
    details: {
      semanticItemId: SEMANTIC_ITEM_ID[params.imuEngId],
      features,
      coldStateValid: params.coldStateValid,
    },
  }
  await writeAiAnswer({
    verificationId: params.verificationId,
    item,
    modelId: 'motoverify-imu-rules',
    modelVersion: IMU_STABILITY_VERSION,
    analysisType: 'imu',
    promptVersion: { global: IMU_FEATURES_VERSION, group: IMU_STABILITY_VERSION, retry: null },
    attempt: 1,
  })
  return classification
}

export async function analyzeEngineIdle(params: {
  verificationId: string
  apiKey: string
  provider: AudioInspectionProvider
}): Promise<{ audio: GeminiItemResult; imu: { result: string; note: string | null } }> {
  const coldStateValid = await getColdStateValid(params.verificationId)
  const [audio, imu] = await Promise.all([
    analyzeSingleAudioItem({
      verificationId: params.verificationId,
      apiKey: params.apiKey,
      provider: params.provider,
      audioEngId: IDLE_AUDIO_ENG_ID,
      semanticItemIds: IDLE_AUDIO_ITEM_IDS,
      promptText: `${ENGINE_AUDIO_GLOBAL_PROMPT}\n\n${IDLE_AUDIO_PROMPT}`,
      promptVersion: IDLE_AUDIO_PROMPT_VERSION,
      coldStateValid,
    }),
    analyzeImuItem({
      verificationId: params.verificationId,
      imuEngId: IDLE_IMU_ENG_ID,
      sessionType: 'idle',
      coldStateValid,
    }),
  ])
  return { audio, imu }
}

export async function analyzeEngineRev(params: {
  verificationId: string
  apiKey: string
  provider: AudioInspectionProvider
}): Promise<{ audio: GeminiItemResult; imu: { result: string; note: string | null } }> {
  const coldStateValid = await getColdStateValid(params.verificationId)
  const [audio, imu] = await Promise.all([
    analyzeSingleAudioItem({
      verificationId: params.verificationId,
      apiKey: params.apiKey,
      provider: params.provider,
      audioEngId: REV_AUDIO_ENG_ID,
      semanticItemIds: REV_AUDIO_ITEM_IDS,
      promptText: `${ENGINE_AUDIO_GLOBAL_PROMPT}\n\n${REV_AUDIO_PROMPT}`,
      promptVersion: REV_AUDIO_PROMPT_VERSION,
      coldStateValid,
    }),
    analyzeImuItem({
      verificationId: params.verificationId,
      imuEngId: REV_IMU_ENG_ID,
      sessionType: 'rev',
      coldStateValid,
    }),
  ])
  return { audio, imu }
}
