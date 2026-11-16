import { ImuFeatureSummary } from './imu-feature-extractor'
import { IMU_THRESHOLDS } from './imu-thresholds-v1'

export const IMU_STABILITY_VERSION = 'imu-stability-v1'

export type ImuStabilityResult = 'normal' | 'attention' | 'unsure'

function qualityGateNote(features: ImuFeatureSummary, itemLabel: string): string | null {
  const { quality } = features
  if (
    quality.sampleCount < IMU_THRESHOLDS.minSampleCount ||
    quality.effectiveSampleRateHz < IMU_THRESHOLDS.minEffectiveSampleRateHz ||
    quality.missingRatio > IMU_THRESHOLDS.maxMissingRatio
  ) {
    return `感測資料量不足或取樣率過低，無法可靠分析${itemLabel}。`
  }
  if (quality.phoneMovementDetected) {
    return `偵測到手機可能移動或旋轉，且未偵測到手機明顯位移的資料不足以排除此可能性，無法可靠分析${itemLabel}。`
  }
  return null
}

/** rule-based, v1 (spec §58: "第一版可以 rule-based，不要假裝有 ML
 *  model") — quality gate → session-internal stability rule. Idle should
 *  stay steady throughout; a stability judgement is entirely independent
 *  from the paired Gemini audio result on the same session (spec §64/§97:
 *  "Analysis Independence" — never let one flip the other). */
export function classifyIdleStability(features: ImuFeatureSummary): {
  result: ImuStabilityResult
  note: string | null
} {
  const gateNote = qualityGateNote(features, '怠速震動穩定度')
  if (gateNote) return { result: 'unsure', note: gateNote }

  if (features.accelerometer.rmsCv > IMU_THRESHOLDS.idleUnstableRmsCv) {
    return {
      result: 'attention',
      note: '在排除手機明顯移動後，怠速期間偵測到多次明顯且不規則的振動能量變化。',
    }
  }
  return { result: 'normal', note: null }
}

/** Rev naturally varies with throttle input, so it uses a looser
 *  window-to-window-variation threshold than idle rather than requiring a
 *  flat RMS across the whole session (spec §51). */
export function classifyRevStability(features: ImuFeatureSummary): {
  result: ImuStabilityResult
  note: string | null
} {
  const gateNote = qualityGateNote(features, '油門轉動運轉穩定度')
  if (gateNote) return { result: 'unsure', note: gateNote }

  if (features.accelerometer.rmsCv > IMU_THRESHOLDS.revUnstableRmsCv) {
    return {
      result: 'attention',
      note: '在排除手機明顯移動後，油門轉動過程偵測到明顯不連續或不規則的振動能量突變。',
    }
  }
  return { result: 'normal', note: null }
}
