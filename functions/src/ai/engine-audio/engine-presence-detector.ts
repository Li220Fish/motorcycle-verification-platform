import { EngineAudioConfig } from './engine-audio.config'
import {
  AudioFeatureTimeline,
  EngineSessionPhases,
  WindowFeatures,
} from './audio-feature-extractor'

export interface PresenceAssessment {
  /** Same order/length as the feature timeline's `windows`. */
  windowPresenceProbability: number[]
  phases: {
    startup: number
    idle: number
    rev: number
  }
}

/**
 * EnginePresenceDetector stage (spec §9's `enginePresentRatio`,
 * §18's threshold gate). Combines two independent signals per window:
 *
 * - RMS above the silence floor (is there sound at all)
 * - Low spectral flatness (a running engine's periodic combustion pulses
 *   are tonal/harmonic, unlike broadband wind/traffic/speech noise, which
 *   is spectrally flat) — this is what keeps loud background noise from
 *   being mistaken for engine presence.
 *
 * A simple weighted blend, not a trained classifier — appropriate for a v1
 * pass; the weights themselves are as much an ENGINEERING ESTIMATE as the
 * presence-ratio thresholds in engine-audio.config.ts and need the same
 * future real-dataset calibration.
 */
export function detectEnginePresence(
  timeline: AudioFeatureTimeline,
  phases: EngineSessionPhases,
  config: EngineAudioConfig,
): PresenceAssessment {
  function windowScore(w: WindowFeatures): number {
    if (w.rms <= config.silenceRmsThreshold) return 0
    const rmsScore = Math.min(1, w.rms / (config.silenceRmsThreshold * 5))
    const tonalScore = 1 - Math.min(1, w.spectralFlatness)
    return Math.min(1, 0.6 * rmsScore + 0.4 * tonalScore)
  }

  const windowPresenceProbability = timeline.windows.map(windowScore)

  function ratioForPhase(bounds: { startMs: number; endMs: number }): number {
    const scoresInPhase = timeline.windows
      .map((w, i) => ({ w, score: windowPresenceProbability[i] }))
      .filter(({ w }) => w.startMs >= bounds.startMs && w.startMs < bounds.endMs)
    if (scoresInPhase.length === 0) return 0
    const present = scoresInPhase.filter(
      ({ score }) => score >= config.presenceProbabilityThreshold,
    ).length
    return present / scoresInPhase.length
  }

  return {
    windowPresenceProbability,
    phases: {
      startup: ratioForPhase(phases.startup),
      idle: ratioForPhase(phases.idle),
      rev: ratioForPhase(phases.rev),
    },
  }
}
