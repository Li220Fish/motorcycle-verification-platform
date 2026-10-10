import { EngineAudioConfig } from './engine-audio.config'
import { peakAmplitude, rms, sliceWindows } from './windowing'

/** Backend JSON shape (spec §23's `recordingAssessment`). `engineDetected`
 *  here is a coarse quality-gate-level signal only (RMS clears the silence
 *  floor at all) — the authoritative per-phase presence ratio comes from
 *  engine-presence-detector.ts downstream; this stage only decides whether
 *  the recording is even worth running the rest of the pipeline on. */
export interface RecordingAssessment {
  usable: boolean
  engineDetected: boolean
  audioQuality: 'good' | 'degraded' | 'unusable'
  silenceRatio: number
  clippingRatio: number
  overallRms: number
  /** Window-to-window RMS coefficient of variation across the idle phase.
   *  A steady real idle measured 0.029; an unsteady one 0.223, and on that
   *  second recording no transient-detection setting worked at any threshold.
   *  Null when no phase boundaries were supplied. */
  idleRmsCv: number | null
  /** True when `idleRmsCv` exceeds the configured ceiling — transient findings
   *  from this recording's idle phase are not trustworthy. */
  idleTooUnsteady: boolean
  /** How far the engine stands above the room, in dB, measured from the
   *  pre-start portion of the recording. Null for sessions that have no
   *  engine-off segment (the buyer's hot check starts with it already
   *  running). This is a quality signal only — subtracting this ambient
   *  profile from the engine-running audio was measured to change nothing,
   *  because the engine runs 30-36 dB above it. */
  ambientMarginDb: number | null
  /** True when the room is loud enough relative to the engine that fine
   *  acoustic judgements should not be trusted. */
  ambientTooLoud: boolean
}

export interface QualityPhaseBounds {
  startup: { startMs: number; endMs: number }
  idle: { startMs: number; endMs: number }
  rev: { startMs: number; endMs: number }
}

/**
 * AudioQualityAnalyzer stage (spec §7). Runs on the RAW (non-normalized)
 * path — silence/clipping are absolute-level properties that a peak-
 * normalized copy would hide entirely.
 */
function segment(
  raw: Float32Array,
  sampleRateHz: number,
  startMs: number,
  endMs: number,
): Float32Array {
  const from = Math.max(0, Math.floor((startMs / 1000) * sampleRateHz))
  const to = Math.min(raw.length, Math.floor((endMs / 1000) * sampleRateHz))
  return to > from ? raw.subarray(from, to) : new Float32Array(0)
}

/** Coefficient of variation of per-window RMS across a phase. */
function rmsCoefficientOfVariation(
  raw: Float32Array,
  config: EngineAudioConfig,
  bounds: { startMs: number; endMs: number },
): number | null {
  const slice = segment(raw, config.sampleRateHz, bounds.startMs, bounds.endMs)
  const windows = sliceWindows(slice, config.sampleRateHz, config.windowMs, config.hopMs)
  if (windows.length < 4) return null
  const values = windows.map((w) => rms(w.samples))
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length
  if (mean <= 0) return null
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance) / mean
}

export function analyzeAudioQuality(
  raw: Float32Array,
  config: EngineAudioConfig,
  phases?: QualityPhaseBounds,
): RecordingAssessment {
  if (raw.length === 0) {
    return {
      usable: false,
      engineDetected: false,
      audioQuality: 'unusable',
      silenceRatio: 1,
      clippingRatio: 0,
      overallRms: 0,
      idleRmsCv: null,
      idleTooUnsteady: false,
      ambientMarginDb: null,
      ambientTooLoud: false,
    }
  }

  const windows = sliceWindows(raw, config.sampleRateHz, config.windowMs, config.hopMs)
  const silentWindows = windows.filter((w) => rms(w.samples) <= config.silenceRmsThreshold).length
  const silenceRatio = windows.length > 0 ? silentWindows / windows.length : 1

  let clippedSamples = 0
  for (let i = 0; i < raw.length; i++) {
    if (Math.abs(raw[i]) >= config.clippingAmplitudeThreshold) clippedSamples++
  }
  const clippingRatio = clippedSamples / raw.length

  const overallRms = rms(raw)
  const overallPeak = peakAmplitude(raw)

  const usable =
    silenceRatio <= config.maxSilenceRatioForUsable &&
    clippingRatio <= config.maxClippingRatioForUsable &&
    overallPeak > 0

  const idleRmsCv = phases ? rmsCoefficientOfVariation(raw, config, phases.idle) : null
  const idleTooUnsteady = idleRmsCv !== null && idleRmsCv > config.maxIdleRmsCv

  // Only meaningful for a session that actually starts with the engine off.
  // The buyer's hot check has a zero-width startup phase by design (the bike
  // is already running when recording begins), so there is no ambient sample
  // to take and the margin stays null rather than being faked from audio that
  // already contains the engine.
  let ambientMarginDb: number | null = null
  if (phases && phases.startup.endMs > phases.startup.startMs) {
    const probeEndMs = Math.min(
      phases.startup.startMs + config.ambientProbeMs,
      phases.startup.endMs,
    )
    const ambient = rms(segment(raw, config.sampleRateHz, phases.startup.startMs, probeEndMs))
    const idle = rms(segment(raw, config.sampleRateHz, phases.idle.startMs, phases.idle.endMs))
    if (ambient > 0 && idle > 0) ambientMarginDb = 20 * Math.log10(idle / ambient)
  }
  const ambientTooLoud = ambientMarginDb !== null && ambientMarginDb < config.minAmbientMarginDb

  const audioQuality: RecordingAssessment['audioQuality'] = !usable
    ? 'unusable'
    : silenceRatio > 0.5 || clippingRatio > 0.1 || idleTooUnsteady || ambientTooLoud
      ? 'degraded'
      : 'good'

  return {
    usable,
    // Coarse pass only — "is there ANY signal above the noise floor at
    // all", not a real engine-vs-non-engine classification.
    engineDetected: usable && overallRms > config.silenceRmsThreshold,
    audioQuality,
    silenceRatio,
    clippingRatio,
    overallRms,
    idleRmsCv,
    idleTooUnsteady,
    ambientMarginDb,
    ambientTooLoud,
  }
}
