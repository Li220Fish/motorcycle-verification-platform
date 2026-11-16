import { RecordingAssessment } from './audio-quality-analyzer'
import { PhaseAssessment } from './engine-phase-analyzer'

export const HARD_RULE_VERSION = 'hard-rule-v1'

export type EngineAudioSemanticItemId =
  | 'starter_motor_sound'
  | 'start_smoothness'
  | 'engine_idle_sound'
  | 'engine_rev_sound'

export interface HardRuleVerdict {
  result: 'normal' | 'attention' | 'unsure'
  label: string
  note: string
}

/** Absent key = this rule set doesn't force an outcome for that item —
 *  engine-result-resolver.ts falls through to Gemini's own verdict. */
export type HardRuleVerdicts = Partial<Record<EngineAudioSemanticItemId, HardRuleVerdict>>

/**
 * EngineHardRuleEvaluator stage (spec §12-17). These outrank Gemini
 * entirely (spec §11/§25: "Gemini 不可以把 deterministic rule 已確認的異常
 * 改成 normal") — engine-result-resolver.ts applies whatever this returns
 * unconditionally, never letting Gemini's own opinion override it.
 */
export function evaluateHardRules(
  quality: RecordingAssessment,
  phaseAssessment: PhaseAssessment,
): HardRuleVerdicts {
  // §12 — NO ENGINE: nothing usable/audible anywhere. Every item is unsure,
  // never normal.
  if (!quality.usable || !quality.engineDetected) {
    const note = '錄音中未偵測到可供分析的機車引擎聲音，無法完成本次引擎聲學檢測。'
    const verdict: HardRuleVerdict = { result: 'unsure', label: 'no_engine_sound_detected', note }
    return {
      starter_motor_sound: verdict,
      start_smoothness: verdict,
      engine_idle_sound: verdict,
      engine_rev_sound: verdict,
    }
  }

  const verdicts: HardRuleVerdicts = {}

  // §13 — FAILED START: starter engaged but never reached sustained
  // running. Idle/rev never established valid analysis conditions, so both
  // are forced unsure — early return, no later rule can override this.
  if (phaseAssessment.startup.starterDetected && !phaseAssessment.startup.sustainedRunningReached) {
    verdicts.starter_motor_sound = {
      result: 'attention',
      label: 'irregular_start_transition',
      note: '偵測到啟動馬達運轉，但引擎未能成功進入穩定運轉狀態，建議進一步確認啟動與供油／點火系統。',
    }
    verdicts.start_smoothness = {
      result: 'attention',
      label: 'irregular_start_transition',
      note: '啟動後未能順利進入穩定運轉狀態，發動過程未能完成。',
    }
    verdicts.engine_idle_sound = {
      result: 'unsure',
      label: 'startup_incomplete',
      note: '因發動未成功，怠速階段未建立有效分析條件，無法判斷。',
    }
    verdicts.engine_rev_sound = {
      result: 'unsure',
      label: 'startup_incomplete',
      note: '因發動未成功，拉轉階段未建立有效分析條件，無法判斷。',
    }
    return verdicts
  }

  // §14 — MULTIPLE START ATTEMPTS.
  if (phaseAssessment.startup.multipleStartAttempts) {
    verdicts.starter_motor_sound = {
      result: 'attention',
      label: 'multiple_start_attempts',
      note: '偵測到兩次以上明確的啟動嘗試，並非一次順利發動。',
    }
    verdicts.start_smoothness = {
      result: 'attention',
      label: 'multiple_start_attempts',
      note: '偵測到多次啟動嘗試，發動過程不流暢。',
    }
  }

  // §15 — IDLE STALL: never normal.
  if (phaseAssessment.idle.stallDetected) {
    verdicts.engine_idle_sound = {
      result: 'attention',
      label: 'engine_stall_during_idle',
      note: '怠速階段偵測到引擎運轉聲明顯中斷並停止，符合怠速過程中熄火的聲學特徵，建議進一步確認怠速穩定性及相關系統。',
    }
  }

  // §16 — REV STALL: never normal.
  if (phaseAssessment.rev.stallDetected) {
    verdicts.engine_rev_sound = {
      result: 'attention',
      label: 'engine_stall_during_rev',
      note: '拉轉階段偵測到引擎運轉聲明顯中斷並停止，符合拉轉過程中熄火的聲學特徵，建議進一步確認。',
    }
  }

  // §17 — REV NOT PERFORMED: only applies when rev didn't already stall
  // (stall implies throttle WAS attempted) — never normal.
  if (!verdicts.engine_rev_sound && !phaseAssessment.rev.throttleChangeDetected) {
    verdicts.engine_rev_sound = {
      result: 'unsure',
      label: 'rev_action_not_detected',
      note: '拉轉階段未偵測到足夠的引擎聲學變化，因此無法完成本項判斷。',
    }
  }

  return verdicts
}

export type HotEngineAudioSemanticItemId = 'engine_idle_sound' | 'engine_rev_sound'
export type HotHardRuleVerdicts = Partial<Record<HotEngineAudioSemanticItemId, HardRuleVerdict>>

/**
 * 熱車檢查 (HOT-04..07) counterpart to evaluateHardRules above — same idle/
 * rev rules (§15-§17), deliberately WITHOUT any startup-related rule
 * (§13/§14): there is no starter_motor_sound/start_smoothness item in the
 * hot pass at all (the engine is already confirmed running by the time this
 * recording starts — see engine-event-detector.ts's `assumeAlreadyRunning`),
 * so `phaseAssessment.startup` is never even read here.
 */
export function evaluateHotEngineHardRules(
  quality: RecordingAssessment,
  phaseAssessment: PhaseAssessment,
): HotHardRuleVerdicts {
  if (!quality.usable || !quality.engineDetected) {
    const note = '錄音中未偵測到可供分析的機車引擎聲音，無法完成本次熱車聲學檢測。'
    const verdict: HardRuleVerdict = { result: 'unsure', label: 'no_engine_sound_detected', note }
    return { engine_idle_sound: verdict, engine_rev_sound: verdict }
  }

  const verdicts: HotHardRuleVerdicts = {}

  if (phaseAssessment.idle.stallDetected) {
    verdicts.engine_idle_sound = {
      result: 'attention',
      label: 'engine_stall_during_idle',
      note: '熱車怠速階段偵測到引擎運轉聲明顯中斷並停止，符合怠速過程中熄火的聲學特徵，建議進一步確認怠速穩定性及相關系統。',
    }
  }

  if (phaseAssessment.rev.stallDetected) {
    verdicts.engine_rev_sound = {
      result: 'attention',
      label: 'engine_stall_during_rev',
      note: '熱車拉轉階段偵測到引擎運轉聲明顯中斷並停止，符合拉轉過程中熄火的聲學特徵，建議進一步確認。',
    }
  }

  if (!verdicts.engine_rev_sound && !phaseAssessment.rev.throttleChangeDetected) {
    verdicts.engine_rev_sound = {
      result: 'unsure',
      label: 'rev_action_not_detected',
      note: '熱車拉轉階段未偵測到足夠的引擎聲學變化，因此無法完成本項判斷。',
    }
  }

  return verdicts
}
