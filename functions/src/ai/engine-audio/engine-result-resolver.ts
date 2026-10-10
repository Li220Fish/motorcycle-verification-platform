import { GeminiItemResult } from '../schemas/common'
import {
  EngineAudioSemanticItemId,
  HardRuleVerdicts,
  HotEngineAudioSemanticItemId,
  HotHardRuleVerdicts,
} from './engine-hard-rule-evaluator'

export const ENGINE_AUDIO_SEMANTIC_ITEM_IDS: EngineAudioSemanticItemId[] = [
  'starter_motor_sound',
  'start_smoothness',
  'engine_idle_sound',
  'engine_rev_sound',
]

export const HOT_ENGINE_AUDIO_SEMANTIC_ITEM_IDS: HotEngineAudioSemanticItemId[] = [
  'engine_idle_sound',
  'engine_rev_sound',
]

export interface ResolvedItemResult {
  itemId: EngineAudioSemanticItemId
  result: 'normal' | 'attention' | 'unsure'
  label: string
  note: string | null
  confidence: number | null
  /** Which Hard Rule label decided this item, or null when Gemini's own
   *  verdict stood unmodified — see engine-hard-rule-evaluator.ts. Persisted
   *  on the Answer for admin traceability (spec §26). */
  hardRuleApplied: string | null
}

/**
 * EngineResultResolver stage (spec §11/§25). Priority order (System Error
 * and Audio Quality already gate everything upstream — by the time this
 * runs, either the whole item set was already forced unsure by
 * evaluateHardRules' §12 no-engine branch, or the recording was usable):
 *   1. Hard Rule verdict, if this item has one — ALWAYS wins, Gemini is
 *      never even consulted for the final value.
 *   2. Otherwise, Gemini's own per-item verdict.
 * Gemini can never downgrade a Hard Rule's "attention"/"unsure" back to
 * "normal" — it is simply not asked to decide that item at all once a Hard
 * Rule has spoken.
 */
export function resolveEngineAudioResults(params: {
  hardRuleVerdicts: HardRuleVerdicts
  geminiResults: GeminiItemResult[]
}): ResolvedItemResult[] {
  return ENGINE_AUDIO_SEMANTIC_ITEM_IDS.map((itemId) => {
    const hardRule = params.hardRuleVerdicts[itemId]
    if (hardRule) {
      return {
        itemId,
        result: hardRule.result,
        label: hardRule.label,
        note: hardRule.note,
        confidence: null,
        hardRuleApplied: hardRule.label,
      }
    }

    const gemini = params.geminiResults.find((r) => r.itemId === itemId)
    if (!gemini) {
      // Defensive only — validateGeminiResults already guarantees every
      // requested item is present in a successful response.
      return {
        itemId,
        result: 'unsure',
        label: 'missing_gemini_result',
        note: '系統未能取得本項目的判定結果，請重新分析。',
        confidence: null,
        hardRuleApplied: null,
      }
    }
    return {
      itemId,
      result: gemini.result === 'not_applicable' ? 'unsure' : gemini.result,
      label: gemini.label,
      note: gemini.note,
      confidence: gemini.confidence,
      hardRuleApplied: null,
    }
  })
}

export interface HotResolvedItemResult {
  itemId: HotEngineAudioSemanticItemId
  result: 'normal' | 'attention' | 'unsure'
  label: string
  note: string | null
  confidence: number | null
  hardRuleApplied: string | null
}

/** 熱車檢查 counterpart to resolveEngineAudioResults above — same Hard-Rule-
 *  always-wins priority, just over the 2 hot semantic items instead of 4. */
export function resolveHotEngineAudioResults(params: {
  hardRuleVerdicts: HotHardRuleVerdicts
  geminiResults: GeminiItemResult[]
}): HotResolvedItemResult[] {
  return HOT_ENGINE_AUDIO_SEMANTIC_ITEM_IDS.map((itemId) => {
    const hardRule = params.hardRuleVerdicts[itemId]
    if (hardRule) {
      return {
        itemId,
        result: hardRule.result,
        label: hardRule.label,
        note: hardRule.note,
        confidence: null,
        hardRuleApplied: hardRule.label,
      }
    }

    const gemini = params.geminiResults.find((r) => r.itemId === itemId)
    if (!gemini) {
      return {
        itemId,
        result: 'unsure',
        label: 'missing_gemini_result',
        note: '系統未能取得本項目的判定結果，請重新分析。',
        confidence: null,
        hardRuleApplied: null,
      }
    }
    return {
      itemId,
      result: gemini.result === 'not_applicable' ? 'unsure' : gemini.result,
      label: gemini.label,
      note: gemini.note,
      confidence: gemini.confidence,
      hardRuleApplied: null,
    }
  })
}
