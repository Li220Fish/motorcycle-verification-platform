import * as crypto from 'node:crypto'

import { decodeEngineAudio } from '../shared/ai/engine-audio/audio-decoder'
import { EngineSessionPhases, extractAudioFeatures } from '../shared/ai/engine-audio/audio-feature-extractor'
import { analyzeAudioQuality } from '../shared/ai/engine-audio/audio-quality-analyzer'
import { preprocessAudio } from '../shared/ai/engine-audio/audio-preprocessor'
import { buildEngineAudioContextBlock } from '../shared/ai/engine-audio/engine-audio-context-block'
import { ENGINE_AUDIO_CONFIG, ENGINE_AUDIO_PIPELINE_VERSIONS } from '../shared/ai/engine-audio/engine-audio.config'
import { detectEngineEvents } from '../shared/ai/engine-audio/engine-event-detector'
import { evaluateHotEngineHardRules } from '../shared/ai/engine-audio/engine-hard-rule-evaluator'
import { analyzeEnginePhases } from '../shared/ai/engine-audio/engine-phase-analyzer'
import { detectEnginePresence } from '../shared/ai/engine-audio/engine-presence-detector'
import { resolveHotEngineAudioResults } from '../shared/ai/engine-audio/engine-result-resolver'
import { detectTransients } from '../shared/ai/engine-audio/transient-detector'
import {
  ENGINE_AUDIO_HOT_V1_ITEM_IDS,
  ENGINE_AUDIO_HOT_V1_PROMPT,
  ENGINE_AUDIO_HOT_V1_PROMPT_VERSION,
} from '../shared/ai/prompts/audio/engine-audio-hot-v1'
import type { AudioInspectionProvider } from '../shared/ai/providers/audio-inspection-provider'
import type { GeminiItemResult } from '../shared/ai/schemas/common'
import { validateGeminiResults } from '../shared/ai/validator'
import { extractImuFeatures } from '../shared/imu/imu-feature-extractor'
import { ImuSample, preprocessImu } from '../shared/imu/imu-preprocessor'
import { classifyIdleStability, classifyRevStability } from '../shared/imu/imu-stability-classifier'

/** RiDE's 熱車檢查 timeline (src/data/verification/engine-session.ts
 *  HOT_ENGINE_SESSION_PHASES): 0–9 s idle, 9–18 s rev, no startup phase. */
export const CHECK_PHASES: EngineSessionPhases = {
  startup: { startMs: 0, endMs: 0 },
  idle: { startMs: 0, endMs: 9000 },
  rev: { startMs: 9000, endMs: 18000 },
}
export const CHECK_DURATION_MS = 18000

export type ItemResult = 'normal' | 'attention' | 'unsure'

export interface CheckItem {
  id: 'engine_idle_sound' | 'engine_rev_sound' | 'idle_stability' | 'rev_stability'
  title: string
  result: ItemResult
  label: string
  note: string | null
  source: 'hard_rule' | 'gemini' | 'dsp_only' | 'imu_rules'
}

export interface CheckResult {
  overall: ItemResult
  items: CheckItem[]
  engineTypeNote: string | null
  aiAvailable: boolean
  pipelineVersions: Record<string, string>
  /** Full DSP output kept for the research dataset. */
  research: Record<string, unknown>
}

const TITLES: Record<CheckItem['id'], string> = {
  engine_idle_sound: '怠速聲音',
  engine_rev_sound: '催油門聲音',
  idle_stability: '怠速震動',
  rev_stability: '催油門震動',
}

/** Any "attention" wins; otherwise "normal" needs both sound items judged
 *  normal (vibration may be missing — some phones give no motion data). */
export function overallOf(items: Array<Pick<CheckItem, 'id' | 'result'>>): ItemResult {
  if (items.some((item) => item.result === 'attention')) return 'attention'
  const sound = items.filter((item) => item.id === 'engine_idle_sound' || item.id === 'engine_rev_sound')
  return sound.length > 0 && sound.every((item) => item.result === 'normal') ? 'normal' : 'unsure'
}

function sliceSamples(samples: ImuSample[], bounds: { startMs: number; endMs: number }): ImuSample[] {
  const originMs = samples[0]?.tMs ?? 0
  return samples.filter((sample) => {
    const relativeMs = sample.tMs - originMs
    return relativeMs >= bounds.startMs && relativeMs < bounds.endMs
  })
}

export function classifyImu(samples: ImuSample[]): CheckItem[] {
  const classify = (sessionType: 'idle' | 'rev'): CheckItem => {
    const bounds = CHECK_PHASES[sessionType]
    const durationMs = bounds.endMs - bounds.startMs
    const id = sessionType === 'idle' ? 'idle_stability' : 'rev_stability'
    const slice = sliceSamples(samples, bounds)
    if (slice.length < 20) {
      return { id, title: TITLES[id], result: 'unsure', label: 'no_motion_data', note: '這支手機沒有提供震動資料。', source: 'imu_rules' }
    }
    const preprocessed = preprocessImu({
      schemaVersion: 1,
      sessionType,
      durationMs,
      placement: '',
      orientation: '',
      targetSampleRateHz: 100,
      samples: slice,
    })
    const features = extractImuFeatures(preprocessed, durationMs)
    const verdict = sessionType === 'idle' ? classifyIdleStability(features) : classifyRevStability(features)
    return {
      id,
      title: TITLES[id],
      result: verdict.result,
      label: verdict.result === 'attention' ? 'unstable_vibration' : 'stable_signal',
      note: verdict.note,
      source: 'imu_rules',
    }
  }
  return [classify('idle'), classify('rev')]
}

/**
 * RiDE's hot-engine audio pipeline (decode → quality → preprocess → features
 * → presence → events → phases → hard rules → Gemini → resolver), minus the
 * verification-specific evidence/answer writes. When Gemini is unavailable
 * the hard rules still decide what they can and the rest reads "unsure".
 */
export async function analyzeCheck(params: {
  audio: Buffer
  audioMimeType: string
  imuSamples: ImuSample[]
  provider: AudioInspectionProvider | null
  apiKey: string
}): Promise<CheckResult> {
  const decoded = await decodeEngineAudio(params.audio)
  const recordingAssessment = analyzeAudioQuality(decoded.samples, ENGINE_AUDIO_CONFIG, CHECK_PHASES)
  const preprocessed = preprocessAudio(decoded, ENGINE_AUDIO_CONFIG)
  const featureTimeline = extractAudioFeatures(preprocessed, CHECK_PHASES, ENGINE_AUDIO_CONFIG)
  const presence = detectEnginePresence(featureTimeline, CHECK_PHASES, ENGINE_AUDIO_CONFIG)
  const detectedEvents = detectEngineEvents(featureTimeline, presence, CHECK_PHASES, ENGINE_AUDIO_CONFIG, true)
  const phaseAssessment = analyzeEnginePhases(presence, detectedEvents, CHECK_PHASES, ENGINE_AUDIO_CONFIG)
  const hardRuleVerdicts = evaluateHotEngineHardRules(recordingAssessment, phaseAssessment)
  const transientAssessment = detectTransients(
    preprocessed.transientBand,
    preprocessed.sampleRateHz,
    CHECK_PHASES,
    recordingAssessment.idleRmsCv ?? 0,
    ENGINE_AUDIO_CONFIG,
  )

  const evidenceId = `engine-line-${crypto.randomUUID()}`
  let geminiResults: GeminiItemResult[] = []
  let engineTypeNote: string | null = null
  let aiAvailable = false
  if (params.provider) {
    try {
      const contextBlock = buildEngineAudioContextBlock({
        recordingAssessment,
        phaseAssessment,
        detectedEvents,
        transientAssessment,
        dspSummary: featureTimeline.phases,
      })
      const analyzed = await params.provider.analyze({
        apiKey: params.apiKey,
        promptText: `${ENGINE_AUDIO_HOT_V1_PROMPT}\n${contextBlock}`,
        promptVersion: ENGINE_AUDIO_HOT_V1_PROMPT_VERSION,
        audio: { evidenceId, base64: params.audio.toString('base64'), mimeType: params.audioMimeType },
        requestedItemIds: [...ENGINE_AUDIO_HOT_V1_ITEM_IDS],
      })
      validateGeminiResults(analyzed.results, {
        requestedItemIds: [...ENGINE_AUDIO_HOT_V1_ITEM_IDS],
        attempt: 1,
        validEvidenceIds: new Set([evidenceId]),
      })
      geminiResults = analyzed.results
      engineTypeNote = analyzed.engineTypeNote || null
      aiAvailable = true
    } catch (error) {
      console.warn('engine-line: Gemini audio analysis failed, falling back to DSP only', error)
    }
  }

  const resolved = resolveHotEngineAudioResults({ hardRuleVerdicts, geminiResults })
  const audioItems: CheckItem[] = resolved.map((item) => {
    const fromGemini = geminiResults.some((result) => result.itemId === item.itemId)
    const decided = item.hardRuleApplied !== null || fromGemini
    return {
      id: item.itemId,
      title: TITLES[item.itemId],
      result: decided ? item.result : 'unsure',
      label: decided ? item.label : 'ai_unavailable',
      note: decided ? item.note : 'AI 分析暫時無法使用，團隊成員會再人工聽這段錄音。',
      source: item.hardRuleApplied ? 'hard_rule' : fromGemini ? 'gemini' : 'dsp_only',
    }
  })
  const items = [...audioItems, ...classifyImu(params.imuSamples)]

  return {
    overall: overallOf(items),
    items,
    engineTypeNote,
    aiAvailable,
    pipelineVersions: { ...ENGINE_AUDIO_PIPELINE_VERSIONS, promptVersion: ENGINE_AUDIO_HOT_V1_PROMPT_VERSION },
    research: {
      recordingAssessment,
      phaseAssessment,
      detectedEvents,
      transientAssessment,
      dspSummary: featureTimeline.phases,
      hardRuleVerdicts,
    },
  }
}
