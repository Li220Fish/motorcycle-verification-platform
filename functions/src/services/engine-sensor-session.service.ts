import { getFirestore } from 'firebase-admin/firestore'
import { GEMINI_MODEL } from '../config'
import {
  ENGINE_AUDIO_V2_ITEM_IDS,
  ENGINE_AUDIO_V2_PROMPT_VERSION,
} from '../ai/prompts/audio/engine-audio-v2'
import { GeminiItemResult } from '../ai/schemas/common'
import { validateGeminiResults } from '../ai/validator'
import { AudioInspectionProvider } from '../ai/providers/audio-inspection-provider'
import { resolveAudioEvidence, resolveImuEvidence } from './evidence.service'
import { writeAiAnswer } from './answer-writer.service'
import { ImuSample, preprocessImu } from '../imu/imu-preprocessor'
import { extractImuFeatures, IMU_FEATURES_VERSION } from '../imu/imu-feature-extractor'
import {
  classifyIdleStability,
  classifyRevStability,
  IMU_STABILITY_VERSION,
} from '../imu/imu-stability-classifier'
import { withAnalysisStatus } from './analysis-status.service'
import { hashPromptText, resolvePromptText } from './prompt-config.service'

/**
 * Verification v2 migration spec §23-§33 — supersedes the 3 separate
 * analyzeEngineStartup/Idle/Rev calls with ONE dispatch over a single fixed
 * 23.0-second synchronized Audio+IMU recording. ENG-03..08 remain this
 * project's EXISTING checklist itemIds (unchanged integration surface —
 * lockedOrder gate / Review missing-items / Report grouping all read/write
 * these exact ids); the routing map's semantic ids (starter_motor_sound,
 * engine_idle_sound, ...) are recorded only inside `aiResult.details.
 * semanticItemId` for traceability, same reconciliation the v1 version used.
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

/** The client-authored phase boundaries embedded in the single IMU session
 * JSON (see EngineInspectionFlow.vue's saveMotionEvidence) — system truth,
 * never re-derived here (spec §27). */
interface EngineSessionPhases {
  startup: { startMs: number; endMs: number }
  idle: { startMs: number; endMs: number }
  rev: { startMs: number; endMs: number }
}
interface EngineSessionImuJson {
  schemaVersion: number
  sessionType: string
  durationMs: number
  phases: EngineSessionPhases
  samples: ImuSample[]
}

function sliceSamples(samples: ImuSample[], bounds: { startMs: number; endMs: number }): ImuSample[] {
  return samples.filter((sample) => sample.tMs >= bounds.startMs && sample.tMs < bounds.endMs)
}

async function getColdStateValid(verificationId: string): Promise<boolean> {
  const snap = await getFirestore().collection('verifications').doc(verificationId).get()
  return (snap.data()?.coldStateContext?.coldStateValid as boolean | undefined) ?? false
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

async function analyzeEngineAudioV2(params: {
  verificationId: string
  apiKey: string
  provider: AudioInspectionProvider
  coldStateValid: boolean
}): Promise<GeminiItemResult[]> {
  // The client duplicates the same one 23s audio blob across all 4 audio
  // items (ENG-03..06) — any one of them resolves the same evidence.
  const audio = await resolveAudioEvidence(params.verificationId, STARTUP_ENG_IDS[0])
  const promptText = await resolvePromptText('engine-audio-v2')
  const results = await params.provider.analyze({
    apiKey: params.apiKey,
    promptText,
    // See core-vision-v2.service.ts for why this is hash-suffixed.
    promptVersion: `${ENGINE_AUDIO_V2_PROMPT_VERSION}:${hashPromptText(promptText)}`,
    audio,
    requestedItemIds: [...ENGINE_AUDIO_V2_ITEM_IDS],
  })
  validateGeminiResults(results, {
    requestedItemIds: [...ENGINE_AUDIO_V2_ITEM_IDS],
    attempt: 1,
    validEvidenceIds: new Set([audio.evidenceId]),
  })

  const audioEngIdBySemantic: Record<string, string> = {
    starter_motor_sound: STARTUP_ENG_IDS[0],
    start_smoothness: STARTUP_ENG_IDS[1],
    engine_idle_sound: IDLE_AUDIO_ENG_ID,
    engine_rev_sound: REV_AUDIO_ENG_ID,
  }

  for (const semanticId of ENGINE_AUDIO_V2_ITEM_IDS) {
    const item = results.find((r) => r.itemId === semanticId)
    if (!item) continue
    const engId = audioEngIdBySemantic[semanticId]
    await writeAiAnswer({
      verificationId: params.verificationId,
      item: { ...withSemanticId(item, engId, params.coldStateValid), itemId: engId },
      modelId: GEMINI_MODEL,
      modelVersion: GEMINI_MODEL,
      analysisType: 'audio',
      promptVersion: { global: 'n/a', group: ENGINE_AUDIO_V2_PROMPT_VERSION, retry: null },
      attempt: 1,
    })
  }
  return results
}

async function analyzeImuItem(params: {
  verificationId: string
  imuEngId: string
  sessionType: 'idle' | 'rev'
  samples: ImuSample[]
  durationMs: number
  coldStateValid: boolean
}): Promise<{ result: string; note: string | null }> {
  const preprocessed = preprocessImu({
    schemaVersion: 1,
    sessionType: params.sessionType,
    durationMs: params.durationMs,
    placement: '',
    orientation: '',
    targetSampleRateHz: 100,
    samples: params.samples,
  })
  const features = extractImuFeatures(preprocessed, params.durationMs)
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

/** ONE dispatch for the whole 23s session: ONE Gemini audio call (4 items)
 * + 2 deterministic IMU classifications (idle/rev), sliced from the SAME
 * single 0-23s sample array using the client-embedded phase boundaries
 * (spec §27: "Gemini / IMU Analyzer 不重新判斷時間區段"). 0-8s (startup) IMU
 * data is stored on the evidence doc but intentionally not classified here
 * (spec §32: "0–8 sec：保存 IMU raw data，目前不產核心 Result"). */
export async function analyzeEngineSensorSessionV2(params: {
  verificationId: string
  apiKey: string
  provider: AudioInspectionProvider
}): Promise<{
  audio: GeminiItemResult[]
  idle: { result: string; note: string | null }
  rev: { result: string; note: string | null }
}> {
  return withAnalysisStatus(params.verificationId, 'engineSensorSession', async () => {
    const coldStateValid = await getColdStateValid(params.verificationId)

    const audio = await analyzeEngineAudioV2({
      verificationId: params.verificationId,
      apiKey: params.apiKey,
      provider: params.provider,
      coldStateValid,
    })

    const { json } = await resolveImuEvidence(params.verificationId, IDLE_IMU_ENG_ID)
    const raw = json as EngineSessionImuJson
    const idleSamples = sliceSamples(raw.samples, raw.phases.idle)
    const revSamples = sliceSamples(raw.samples, raw.phases.rev)

    const [idle, rev] = await Promise.all([
      analyzeImuItem({
        verificationId: params.verificationId,
        imuEngId: IDLE_IMU_ENG_ID,
        sessionType: 'idle',
        samples: idleSamples,
        durationMs: raw.phases.idle.endMs - raw.phases.idle.startMs,
        coldStateValid,
      }),
      analyzeImuItem({
        verificationId: params.verificationId,
        imuEngId: REV_IMU_ENG_ID,
        sessionType: 'rev',
        samples: revSamples,
        durationMs: raw.phases.rev.endMs - raw.phases.rev.startMs,
        coldStateValid,
      }),
    ])

    return { audio, idle, rev }
  })
}
