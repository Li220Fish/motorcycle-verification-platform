import { getFirestore } from 'firebase-admin/firestore'
import { GEMINI_MODEL } from '../config'
import {
  ENGINE_AUDIO_V3_ITEM_IDS,
  ENGINE_AUDIO_V3_PROMPT_VERSION,
} from '../ai/prompts/audio/engine-audio-v3'
import {
  ENGINE_AUDIO_HOT_V1_ITEM_IDS,
  ENGINE_AUDIO_HOT_V1_PROMPT_VERSION,
} from '../ai/prompts/audio/engine-audio-hot-v1'
import { GeminiItemResult } from '../ai/schemas/common'
import { validateGeminiResults } from '../ai/validator'
import { AudioInspectionProvider } from '../ai/providers/audio-inspection-provider'
import { markEngineAudioAnalysisOnEvidence, resolveAudioEvidence, resolveImuEvidence } from './evidence.service'
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
import { decodeEngineAudio } from '../ai/engine-audio/audio-decoder'
import { analyzeAudioQuality } from '../ai/engine-audio/audio-quality-analyzer'
import { detectTransients } from '../ai/engine-audio/transient-detector'
import { preprocessAudio } from '../ai/engine-audio/audio-preprocessor'
import { EngineSessionPhases, extractAudioFeatures } from '../ai/engine-audio/audio-feature-extractor'
import { detectEnginePresence } from '../ai/engine-audio/engine-presence-detector'
import { detectEngineEvents } from '../ai/engine-audio/engine-event-detector'
import { analyzeEnginePhases } from '../ai/engine-audio/engine-phase-analyzer'
import { evaluateHardRules, evaluateHotEngineHardRules } from '../ai/engine-audio/engine-hard-rule-evaluator'
import { buildEngineAudioContextBlock } from '../ai/engine-audio/engine-audio-context-block'
import { resolveEngineAudioResults, resolveHotEngineAudioResults } from '../ai/engine-audio/engine-result-resolver'
import { ENGINE_AUDIO_CONFIG, ENGINE_AUDIO_PIPELINE_VERSIONS } from '../ai/engine-audio/engine-audio.config'

/**
 * Verification v2 migration spec §23-§33 — supersedes the 3 separate
 * analyzeEngineStartup/Idle/Rev calls with ONE dispatch over a single fixed
 * 23.0-second synchronized Audio+IMU recording. ENG-03..08 remain this
 * project's EXISTING checklist itemIds (unchanged integration surface —
 * lockedOrder gate / Review missing-items / Report grouping all read/write
 * these exact ids); the routing map's semantic ids (starter_motor_sound,
 * engine_idle_sound, ...) are recorded only inside `aiResult.details.
 * semanticItemId` for traceability, same reconciliation the v1 version used.
 *
 * Engine Audio v3 (2026-09): the audio half of this dispatch is no longer
 * "record 23s → ask Gemini → done" — see functions/src/ai/engine-audio/ for
 * the full Decoder → Quality Gate → Preprocessor → Feature Extractor →
 * Presence Detector → Event Detector → Phase Analyzer → Hard Rule Evaluator
 * pipeline that runs BEFORE Gemini, and engine-result-resolver.ts for how a
 * confirmed Hard Rule always outranks whatever Gemini itself returns. The
 * IMU half (idle/rev stability below) is unchanged — already deterministic,
 * already never touches Gemini.
 */
const STARTUP_ENG_IDS = ['ENG-03', 'ENG-04'] as const // starter_motor_sound, start_smoothness
const IDLE_AUDIO_ENG_ID = 'ENG-05' // engine_idle_sound
const IDLE_IMU_ENG_ID = 'ENG-07' // idle_stability
const REV_AUDIO_ENG_ID = 'ENG-06' // engine_rev_sound
const REV_IMU_ENG_ID = 'ENG-08' // rev_stability

// Keyed by engineering itemId (ENG-*/HOT-* never collide), consumed by both
// analyzeImuItem below and analyzeHotEngineAudio further down — one shared
// lookup rather than a second copy, since the direction (itemId -> semantic
// label) has no cold/hot ambiguity the way AUDIO_ENG_ID_BY_SEMANTIC's
// reverse direction does (see that constant's own comment).
const SEMANTIC_ITEM_ID: Record<string, string> = {
  'ENG-03': 'starter_motor_sound',
  'ENG-04': 'start_smoothness',
  'ENG-05': 'engine_idle_sound',
  'ENG-06': 'engine_rev_sound',
  'ENG-07': 'idle_stability',
  'ENG-08': 'rev_stability',
  'HOT-04': 'engine_idle_sound',
  'HOT-05': 'engine_rev_sound',
  'HOT-06': 'idle_stability',
  'HOT-07': 'rev_stability',
}

const AUDIO_ENG_ID_BY_SEMANTIC: Record<string, string> = {
  starter_motor_sound: STARTUP_ENG_IDS[0],
  start_smoothness: STARTUP_ENG_IDS[1],
  engine_idle_sound: IDLE_AUDIO_ENG_ID,
  engine_rev_sound: REV_AUDIO_ENG_ID,
}

/** The client-authored phase boundaries embedded in the single IMU session
 * JSON (see EngineInspectionFlow.vue's saveMotionEvidence) — system truth,
 * never re-derived here (spec §27). The audio pipeline reads these exact
 * same boundaries (see analyzeEngineAudioV3 below) so audio and IMU always
 * agree on where each phase starts/ends. */
interface EngineSessionImuJson {
  schemaVersion: number
  sessionType: string
  durationMs: number
  phases: EngineSessionPhases
  samples: ImuSample[]
}

/** Normalizes each sample's `tMs` to be relative to the session's own first
 *  sample before slicing — defends against EngineInspectionFlow.vue builds
 *  older than 2026-09 (real installed APKs update on their own schedule, not
 *  instantly) that wrote `tMs` as an absolute Date.now() epoch value instead
 *  of relative-to-recording-start, which made every sample fall outside
 *  every phase's [startMs,endMs) window and always failed idle/rev IMU
 *  classification with "感測資料量不足" regardless of the actual recording
 *  quality (found live 2026-09, fixed at the source too). A no-op for
 *  already-relative data (session start already reads ~0). */
function sliceSamples(samples: ImuSample[], bounds: { startMs: number; endMs: number }): ImuSample[] {
  const originMs = samples[0]?.tMs ?? 0
  return samples.filter((sample) => {
    const relativeMs = sample.tMs - originMs
    return relativeMs >= bounds.startMs && relativeMs < bounds.endMs
  })
}

async function getColdStateValid(verificationId: string): Promise<boolean> {
  const snap = await getFirestore().collection('verifications').doc(verificationId).get()
  return (snap.data()?.coldStateContext?.coldStateValid as boolean | undefined) ?? false
}

/**
 * Runs the full Engine Audio v3 pipeline (decode → quality → preprocess →
 * features → presence → events → phase validity → hard rules → Gemini →
 * final resolver) and writes each of the 4 audio items' Answer doc. Returns
 * the final GeminiItemResult-shaped list purely for the caller's own return
 * value (nothing downstream reads it further today).
 */
async function analyzeEngineAudioV3(params: {
  verificationId: string
  apiKey: string
  provider: AudioInspectionProvider
  coldStateValid: boolean
  phases: EngineSessionPhases
}): Promise<GeminiItemResult[]> {
  // The client duplicates the same one 23s audio blob across all 4 audio
  // items (ENG-03..06) — any one of them resolves the same evidence.
  const audio = await resolveAudioEvidence(params.verificationId, STARTUP_ENG_IDS[0])
  const rawBuffer = Buffer.from(audio.base64, 'base64')

  const decoded = await decodeEngineAudio(rawBuffer)
  const recordingAssessment = analyzeAudioQuality(decoded.samples, ENGINE_AUDIO_CONFIG, params.phases)
  const preprocessed = preprocessAudio(decoded, ENGINE_AUDIO_CONFIG)
  const featureTimeline = extractAudioFeatures(preprocessed, params.phases, ENGINE_AUDIO_CONFIG)
  const presence = detectEnginePresence(featureTimeline, params.phases, ENGINE_AUDIO_CONFIG)
  const detectedEvents = detectEngineEvents(featureTimeline, presence, params.phases, ENGINE_AUDIO_CONFIG)
  const phaseAssessment = analyzeEnginePhases(presence, detectedEvents, params.phases, ENGINE_AUDIO_CONFIG)
  // Separate short-window, band-limited pass for mechanical tapping — see
  // transient-detector.ts for why the 250 ms main path cannot see these.
  // Purely descriptive: it produces no hard-rule verdict.
  const transientAssessment = detectTransients(
    preprocessed.transientBand,
    preprocessed.sampleRateHz,
    params.phases,
    recordingAssessment.idleRmsCv ?? 0,
    ENGINE_AUDIO_CONFIG,
  )
  // Hard Rules are evaluated BEFORE Gemini is ever called and, per
  // engine-result-resolver.ts, unconditionally outrank it — Gemini is never
  // in a position to talk a confirmed stall/failed-start/skipped-rev back
  // down to normal (spec §11/§25).
  const hardRuleVerdicts = evaluateHardRules(recordingAssessment, phaseAssessment)

  const contextBlock = buildEngineAudioContextBlock({
    recordingAssessment,
    phaseAssessment,
    detectedEvents,
    dspSummary: featureTimeline.phases,
    transientAssessment,
  })
  const basePromptText = await resolvePromptText('engine-audio-v3')
  // The shared Gemini client (ai/gemini/client.ts) only accepts one
  // promptText string — the deterministic context is appended as a plain
  // text block rather than a new content-part type (spec §19: summary only,
  // never raw per-window DSP arrays — contextBlock's dspSummary is already
  // the per-phase aggregate, not the full timeline).
  const promptText = basePromptText + '\n' + contextBlock

  const {
    results: geminiResults,
    engineTypeNote,
    engineTypeConfidence,
  } = await params.provider.analyze({
    apiKey: params.apiKey,
    promptText,
    // See core-vision-v2.service.ts for why this is hash-suffixed.
    promptVersion: `${ENGINE_AUDIO_V3_PROMPT_VERSION}:${hashPromptText(basePromptText)}`,
    audio,
    requestedItemIds: [...ENGINE_AUDIO_V3_ITEM_IDS],
  })
  validateGeminiResults(geminiResults, {
    requestedItemIds: [...ENGINE_AUDIO_V3_ITEM_IDS],
    attempt: 1,
    validEvidenceIds: new Set([audio.evidenceId]),
  })

  const resolved = resolveEngineAudioResults({ hardRuleVerdicts, geminiResults })
  const pipelineVersions: Record<string, string> = {
    ...ENGINE_AUDIO_PIPELINE_VERSIONS,
    promptVersion: ENGINE_AUDIO_V3_PROMPT_VERSION,
  }

  if (engineTypeNote) {
    await markEngineAudioAnalysisOnEvidence(params.verificationId, audio.evidenceId, {
      recordingAssessment,
      phaseAssessment,
      detectedEvents,
      dspSummary: featureTimeline.phases,
      engineTypeNote,
      engineTypeConfidence: engineTypeConfidence ?? 0,
      pipelineVersions,
    })
  }

  const finalResults: GeminiItemResult[] = []
  for (const item of resolved) {
    const engId = AUDIO_ENG_ID_BY_SEMANTIC[item.itemId]
    const geminiShaped: GeminiItemResult = {
      itemId: engId,
      result: item.result,
      confidence: item.confidence,
      label: item.label,
      note: item.note,
      evidenceIds: [audio.evidenceId],
      problematicEvidenceIds: [],
      retakeInstruction: null,
      details: {
        semanticItemId: SEMANTIC_ITEM_ID[engId],
        coldStateValid: params.coldStateValid,
        pipelineVersions,
        hardRuleApplied: item.hardRuleApplied,
      },
    }
    finalResults.push(geminiShaped)
    // modelId stays GEMINI_MODEL even for a Hard-Rule-decided item: Gemini
    // still ran (one combined call covers all 4 items, nothing skips it
    // individually) — `hardRuleApplied` in `details` is what actually
    // records whose verdict won.
    await writeAiAnswer({
      verificationId: params.verificationId,
      item: geminiShaped,
      modelId: GEMINI_MODEL,
      modelVersion: GEMINI_MODEL,
      analysisType: 'audio',
      promptVersion: { global: 'n/a', group: ENGINE_AUDIO_V3_PROMPT_VERSION, retry: null },
      attempt: 1,
    })
  }
  return finalResults
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

/** ONE dispatch for the whole 23s session: ONE Gemini audio call (4 items,
 * fed by the full Engine Audio v3 DSP pipeline) + 2 deterministic IMU
 * classifications (idle/rev), sliced from the SAME single 0-23s sample
 * array using the client-embedded phase boundaries (spec §27: "Gemini / IMU
 * Analyzer 不重新判斷時間區段"). 0-5s (startup) IMU data is stored on the
 * evidence doc but intentionally not classified here (spec §32: "0–8 sec：
 * 保存 IMU raw data，目前不產核心 Result" — boundary itself moved to 0-5s in
 * 2026-09's phase-timing update, see ENGINE_SESSION_PHASES in
 * src/data/verification/engine-session.ts). */
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

    // Resolved first (not just for IMU slicing, as before) — the audio
    // pipeline needs these exact same phase boundaries too.
    const { json } = await resolveImuEvidence(params.verificationId, IDLE_IMU_ENG_ID)
    const raw = json as EngineSessionImuJson

    const audio = await analyzeEngineAudioV3({
      verificationId: params.verificationId,
      apiKey: params.apiKey,
      provider: params.provider,
      coldStateValid,
      phases: raw.phases,
    })

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

// --- 熱車檢查 (buyer-verification.ts's HOT-04..07, reached after 上路) ------
// Same pipeline shape as the cold pass above, just a shorter 2-phase
// (idle+rev, no startup) recording and 2 audio semantic items instead of 4 —
// see engine-audio-hot-v1.ts's own doc comment for why there's no
// starter_motor_sound/start_smoothness here at all.
const HOT_IDLE_AUDIO_ENG_ID = 'HOT-04' // engine_idle_sound
const HOT_IDLE_IMU_ENG_ID = 'HOT-06' // idle_stability
const HOT_REV_AUDIO_ENG_ID = 'HOT-05' // engine_rev_sound
const HOT_REV_IMU_ENG_ID = 'HOT-07' // rev_stability

const HOT_AUDIO_ENG_ID_BY_SEMANTIC: Record<string, string> = {
  engine_idle_sound: HOT_IDLE_AUDIO_ENG_ID,
  engine_rev_sound: HOT_REV_AUDIO_ENG_ID,
}

async function analyzeHotEngineAudio(params: {
  verificationId: string
  apiKey: string
  provider: AudioInspectionProvider
  coldStateValid: boolean
  phases: EngineSessionPhases
}): Promise<GeminiItemResult[]> {
  // The client duplicates the same one 18s audio blob across both hot audio
  // items (HOT-04/05) — either one resolves the same evidence, same
  // convention as the cold pass's STARTUP_ENG_IDS[0].
  const audio = await resolveAudioEvidence(params.verificationId, HOT_IDLE_AUDIO_ENG_ID)
  const rawBuffer = Buffer.from(audio.base64, 'base64')

  const decoded = await decodeEngineAudio(rawBuffer)
  const recordingAssessment = analyzeAudioQuality(decoded.samples, ENGINE_AUDIO_CONFIG, params.phases)
  const preprocessed = preprocessAudio(decoded, ENGINE_AUDIO_CONFIG)
  const featureTimeline = extractAudioFeatures(preprocessed, params.phases, ENGINE_AUDIO_CONFIG)
  const presence = detectEnginePresence(featureTimeline, params.phases, ENGINE_AUDIO_CONFIG)
  // `assumeAlreadyRunning: true` — the engine is already confirmed running
  // for the whole recording (上路 just finished), so there is no startup
  // event to detect at all; see engine-event-detector.ts's own doc comment.
  const detectedEvents = detectEngineEvents(
    featureTimeline,
    presence,
    params.phases,
    ENGINE_AUDIO_CONFIG,
    true,
  )
  const phaseAssessment = analyzeEnginePhases(presence, detectedEvents, params.phases, ENGINE_AUDIO_CONFIG)
  const hardRuleVerdicts = evaluateHotEngineHardRules(recordingAssessment, phaseAssessment)
  const transientAssessment = detectTransients(
    preprocessed.transientBand,
    preprocessed.sampleRateHz,
    params.phases,
    recordingAssessment.idleRmsCv ?? 0,
    ENGINE_AUDIO_CONFIG,
  )

  const contextBlock = buildEngineAudioContextBlock({
    recordingAssessment,
    phaseAssessment,
    detectedEvents,
    transientAssessment,
    dspSummary: featureTimeline.phases,
  })
  const basePromptText = await resolvePromptText('engine-audio-hot-v1')
  const promptText = basePromptText + '\n' + contextBlock

  const {
    results: geminiResults,
    engineTypeNote,
    engineTypeConfidence,
  } = await params.provider.analyze({
    apiKey: params.apiKey,
    promptText,
    promptVersion: `${ENGINE_AUDIO_HOT_V1_PROMPT_VERSION}:${hashPromptText(basePromptText)}`,
    audio,
    requestedItemIds: [...ENGINE_AUDIO_HOT_V1_ITEM_IDS],
  })
  validateGeminiResults(geminiResults, {
    requestedItemIds: [...ENGINE_AUDIO_HOT_V1_ITEM_IDS],
    attempt: 1,
    validEvidenceIds: new Set([audio.evidenceId]),
  })

  const resolved = resolveHotEngineAudioResults({ hardRuleVerdicts, geminiResults })
  const pipelineVersions: Record<string, string> = {
    ...ENGINE_AUDIO_PIPELINE_VERSIONS,
    promptVersion: ENGINE_AUDIO_HOT_V1_PROMPT_VERSION,
  }

  if (engineTypeNote) {
    await markEngineAudioAnalysisOnEvidence(params.verificationId, audio.evidenceId, {
      recordingAssessment,
      phaseAssessment,
      detectedEvents,
      dspSummary: featureTimeline.phases,
      engineTypeNote,
      engineTypeConfidence: engineTypeConfidence ?? 0,
      pipelineVersions,
    })
  }

  const finalResults: GeminiItemResult[] = []
  for (const item of resolved) {
    const hotId = HOT_AUDIO_ENG_ID_BY_SEMANTIC[item.itemId]
    const geminiShaped: GeminiItemResult = {
      itemId: hotId,
      result: item.result,
      confidence: item.confidence,
      label: item.label,
      note: item.note,
      evidenceIds: [audio.evidenceId],
      problematicEvidenceIds: [],
      retakeInstruction: null,
      details: {
        semanticItemId: SEMANTIC_ITEM_ID[hotId],
        coldStateValid: params.coldStateValid,
        pipelineVersions,
        hardRuleApplied: item.hardRuleApplied,
      },
    }
    finalResults.push(geminiShaped)
    await writeAiAnswer({
      verificationId: params.verificationId,
      item: geminiShaped,
      modelId: GEMINI_MODEL,
      modelVersion: GEMINI_MODEL,
      analysisType: 'audio',
      promptVersion: { global: 'n/a', group: ENGINE_AUDIO_HOT_V1_PROMPT_VERSION, retry: null },
      attempt: 1,
    })
  }
  return finalResults
}

/** ONE dispatch for the whole 18s 熱車檢查 session — mirrors
 * analyzeEngineSensorSessionV2 above exactly, just against HOT-04..07
 * instead of ENG-03..08. `coldStateValid` is still read/recorded on these
 * Answers for consistency with the cold pass's own traceability field, even
 * though a buyer's 熱車檢查 is never gated on it. */
export async function analyzeHotEngineSensorSessionV2(params: {
  verificationId: string
  apiKey: string
  provider: AudioInspectionProvider
}): Promise<{
  audio: GeminiItemResult[]
  idle: { result: string; note: string | null }
  rev: { result: string; note: string | null }
}> {
  return withAnalysisStatus(params.verificationId, 'hotEngineSensorSession', async () => {
    const coldStateValid = await getColdStateValid(params.verificationId)

    const { json } = await resolveImuEvidence(params.verificationId, HOT_IDLE_IMU_ENG_ID)
    const raw = json as EngineSessionImuJson

    const audio = await analyzeHotEngineAudio({
      verificationId: params.verificationId,
      apiKey: params.apiKey,
      provider: params.provider,
      coldStateValid,
      phases: raw.phases,
    })

    const idleSamples = sliceSamples(raw.samples, raw.phases.idle)
    const revSamples = sliceSamples(raw.samples, raw.phases.rev)

    const [idle, rev] = await Promise.all([
      analyzeImuItem({
        verificationId: params.verificationId,
        imuEngId: HOT_IDLE_IMU_ENG_ID,
        sessionType: 'idle',
        samples: idleSamples,
        durationMs: raw.phases.idle.endMs - raw.phases.idle.startMs,
        coldStateValid,
      }),
      analyzeImuItem({
        verificationId: params.verificationId,
        imuEngId: HOT_REV_IMU_ENG_ID,
        sessionType: 'rev',
        samples: revSamples,
        durationMs: raw.phases.rev.endMs - raw.phases.rev.startMs,
        coldStateValid,
      }),
    ])

    return { audio, idle, rev }
  })
}
