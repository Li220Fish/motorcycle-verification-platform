import { AmbientAudioMetrics } from '../audio/ambient-audio-metrics'
import { ENVIRONMENT_THRESHOLDS } from './environment-thresholds-v1'

export type NoiseLevel = 'low' | 'moderate' | 'high'

export interface EnvironmentAudioClassification {
  noiseLevel: NoiseLevel
  windNoise: NoiseLevel
  audioSuitable: boolean
}

/** Rule-based, v1 (same reasoning as imu-stability-classifier.ts — Gemini
 *  never receives the audio track in this design, only the extracted video
 *  frames; the ambient-audio semantic labels are deterministic thresholds
 *  on the metrics computed in ambient-audio-metrics.ts). */
export function classifyEnvironmentAudio(metrics: AmbientAudioMetrics): EnvironmentAudioClassification {
  const noiseLevel: NoiseLevel =
    metrics.rms < ENVIRONMENT_THRESHOLDS.noiseRmsLow
      ? 'low'
      : metrics.rms < ENVIRONMENT_THRESHOLDS.noiseRmsModerate
        ? 'moderate'
        : 'high'

  const windNoise: NoiseLevel =
    metrics.windLikeLowFrequencyEnergy < ENVIRONMENT_THRESHOLDS.windEnergyLow
      ? 'low'
      : metrics.windLikeLowFrequencyEnergy < ENVIRONMENT_THRESHOLDS.windEnergyModerate
        ? 'moderate'
        : 'high'

  const audioSuitable =
    noiseLevel !== 'high' && metrics.clippingRatio <= ENVIRONMENT_THRESHOLDS.maxClippingRatioForSuitable

  return { noiseLevel, windNoise, audioSuitable }
}
