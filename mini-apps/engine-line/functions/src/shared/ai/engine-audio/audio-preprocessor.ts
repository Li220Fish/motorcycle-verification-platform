import { DecodedAudio } from './audio-decoder'
import { EngineAudioConfig } from './engine-audio.config'

/**
 * AudioPreprocessor stage (spec §5/§6). Produces TWO paths from the same
 * decoded audio, never one overwriting the other:
 *
 * - `raw`: DC-removed (+ optional high-pass) but NOT amplitude-normalized —
 *   a sudden volume drop, engine-sound disappearance, or rev-phase energy
 *   increase is itself meaningful information (spec §6: "突然掉音量/熄火/能量
 *   變化/拉轉能量提升 本身就是重要資訊"), so RMS/peak/crest-factor/energy-
 *   envelope/clipping/silence features must all be computed from THIS path,
 *   never from a normalized copy.
 * - `normalized`: a peak-normalized copy of `raw`, used only for spectral
 *   analysis (STFT/frequency-pattern/harmonics/periodicity) where absolute
 *   level doesn't matter but a consistent scale simplifies comparing
 *   spectral shape across windows.
 */
export interface PreprocessedAudio {
  raw: Float32Array
  normalized: Float32Array
  /** Band-limited copy for transient analysis only (transient-detector.ts).
   *  Separate from `normalized` on purpose: restricting to 2-8 kHz is what
   *  makes a tap visible at all, but it would destroy the broadband shape the
   *  main spectral features describe, so the two can never share one path. */
  transientBand: Float32Array
  sampleRateHz: number
}

function removeDcOffset(samples: Float32Array): Float32Array {
  let mean = 0
  for (let i = 0; i < samples.length; i++) mean += samples[i]
  mean /= samples.length || 1
  const result = new Float32Array(samples.length)
  for (let i = 0; i < samples.length; i++) result[i] = samples[i] - mean
  return result
}

/**
 * One 2nd-order Butterworth (RBJ) biquad section, applied `stages` times.
 *
 * Replaces the previous one-pole filter, whose ~6 dB/octave slope made a 20 Hz
 * corner almost a no-op against the 50-150 Hz handling and wind rumble that
 * actually dominates these recordings — see engine-audio.config.ts's
 * `highPassCutoffHz` for the measurements.
 */
function biquadFilter(
  samples: Float32Array,
  sampleRateHz: number,
  cutoffHz: number,
  kind: 'highpass' | 'lowpass',
  stages: number,
): Float32Array {
  const w0 = (2 * Math.PI * cutoffHz) / sampleRateHz
  const cosW = Math.cos(w0)
  const alpha = Math.sin(w0) / (2 * Math.SQRT1_2) // Q = 1/sqrt(2), Butterworth
  const a0 = 1 + alpha
  const a1 = (-2 * cosW) / a0
  const a2 = (1 - alpha) / a0
  const b0 = (kind === 'highpass' ? (1 + cosW) / 2 : (1 - cosW) / 2) / a0
  const b1 = (kind === 'highpass' ? -(1 + cosW) : 1 - cosW) / a0
  const b2 = b0

  let signal = samples
  for (let stage = 0; stage < stages; stage++) {
    const out = new Float32Array(signal.length)
    let x1 = 0
    let x2 = 0
    let y1 = 0
    let y2 = 0
    for (let i = 0; i < signal.length; i++) {
      const x0 = signal[i]
      const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
      out[i] = y0
      x2 = x1
      x1 = x0
      y2 = y1
      y1 = y0
    }
    signal = out
  }
  return signal
}

/**
 * Scales by overall RMS rather than by the single loudest sample.
 *
 * The gain is additionally capped so the loudest sample still lands below full
 * scale: a quiet recording would otherwise be amplified into hard clipping,
 * which would be a worse artifact than the level inconsistency this is here to
 * remove.
 */
function rmsNormalize(samples: Float32Array, targetRms: number): Float32Array {
  let sumSquares = 0
  let peak = 0
  for (let i = 0; i < samples.length; i++) {
    sumSquares += samples[i] * samples[i]
    const abs = Math.abs(samples[i])
    if (abs > peak) peak = abs
  }
  if (samples.length === 0 || peak === 0) return new Float32Array(samples.length)
  const currentRms = Math.sqrt(sumSquares / samples.length)
  if (currentRms === 0) return new Float32Array(samples.length)

  const scale = Math.min(targetRms / currentRms, 0.99 / peak)
  const result = new Float32Array(samples.length)
  for (let i = 0; i < samples.length; i++) result[i] = samples[i] * scale
  return result
}

function peakNormalize(samples: Float32Array): Float32Array {
  let peak = 0
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i])
    if (abs > peak) peak = abs
  }
  if (peak === 0) return new Float32Array(samples.length)
  const scale = 1 / peak
  const result = new Float32Array(samples.length)
  for (let i = 0; i < samples.length; i++) result[i] = samples[i] * scale
  return result
}

export function preprocessAudio(decoded: DecodedAudio, config: EngineAudioConfig): PreprocessedAudio {
  const dcRemoved = removeDcOffset(decoded.samples)
  const raw = config.highPassCutoffHz
    ? biquadFilter(
        dcRemoved,
        decoded.sampleRateHz,
        config.highPassCutoffHz,
        'highpass',
        Math.max(1, config.highPassStages),
      )
    : dcRemoved

  const normalized =
    config.normalization === 'rms'
      ? rmsNormalize(raw, config.normalizationTargetRms)
      : peakNormalize(raw)

  // Band-pass = high-pass then low-pass, both cascaded for a steep enough
  // skirt that the sub-500 Hz bulk (83-93% of a real idle's energy) is gone
  // rather than merely reduced.
  const nyquistHz = decoded.sampleRateHz / 2
  const bandHighHz = Math.min(config.transientBandHighHz, nyquistHz * 0.98)
  const transientBand =
    config.transientBandLowHz < bandHighHz
      ? biquadFilter(
          biquadFilter(raw, decoded.sampleRateHz, config.transientBandLowHz, 'highpass', 2),
          decoded.sampleRateHz,
          bandHighHz,
          'lowpass',
          2,
        )
      : new Float32Array(raw.length)

  return { raw, normalized, transientBand, sampleRateHz: decoded.sampleRateHz }
}
