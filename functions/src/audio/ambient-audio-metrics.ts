import type { PcmAudio } from '../video/video-tools'

/** Deterministic ambient-audio baseline (Environment spec §9) — computed
 *  once from the Environment Video's own audio track, no Gemini involved.
 *  Later Startup/Idle/Rev audio analysis can compare against this baseline
 *  to tell "the environment itself was noisy" apart from "the engine sounds
 *  abnormal" (spec §13). */
export interface AmbientAudioMetrics {
  rms: number
  peak: number
  noiseFloorEstimate: number
  clippingRatio: number
  silenceRatio: number
  windLikeLowFrequencyEnergy: number
}

const CLIPPING_THRESHOLD = 0.98
const SILENCE_RMS_THRESHOLD = 0.02
const WINDOW_MS = 20

function normalize(samples: Int16Array): Float64Array {
  const out = new Float64Array(samples.length)
  for (let i = 0; i < samples.length; i++) out[i] = samples[i] / 32768
  return out
}

function windowedRms(normalized: Float64Array, sampleRateHz: number, windowMs: number): number[] {
  const windowSize = Math.max(1, Math.round((sampleRateHz * windowMs) / 1000))
  const rmsValues: number[] = []
  for (let start = 0; start < normalized.length; start += windowSize) {
    const end = Math.min(start + windowSize, normalized.length)
    let sumSquares = 0
    for (let i = start; i < end; i++) sumSquares += normalized[i] * normalized[i]
    rmsValues.push(Math.sqrt(sumSquares / (end - start)))
  }
  return rmsValues
}

/** Block-average decimation down to ~targetRateHz — wind/rumble energy of
 *  interest here is well under 150Hz, so a coarse downsample keeps the
 *  low-frequency content intact (Nyquist-safe) while making the direct-sum
 *  DFT below cheap enough for a ~15s clip (same "no FFT dependency, cheap
 *  enough for one request" reasoning as imu-feature-extractor.ts). */
function decimate(normalized: Float64Array, sampleRateHz: number, targetRateHz: number): Float64Array {
  const factor = Math.max(1, Math.round(sampleRateHz / targetRateHz))
  const outLength = Math.floor(normalized.length / factor)
  const out = new Float64Array(outLength)
  for (let i = 0; i < outLength; i++) {
    let sum = 0
    for (let j = 0; j < factor; j++) sum += normalized[i * factor + j]
    out[i] = sum / factor
  }
  return out
}

function lowFrequencyEnergyRatio(decimated: Float64Array, effectiveRateHz: number): number {
  const n = decimated.length
  if (n < 8) return 0
  const nyquist = effectiveRateHz / 2
  const lowBandMaxHz = Math.min(150, nyquist)
  let lowEnergy = 0
  let totalEnergy = 0
  for (let f = 0.5; f <= nyquist; f += 0.5) {
    let re = 0
    let im = 0
    const omega = (2 * Math.PI * f) / effectiveRateHz
    for (let i = 0; i < n; i++) {
      re += decimated[i] * Math.cos(omega * i)
      im -= decimated[i] * Math.sin(omega * i)
    }
    const power = (re * re + im * im) / n
    totalEnergy += power
    if (f <= lowBandMaxHz) lowEnergy += power
  }
  return totalEnergy > 0 ? Number((lowEnergy / totalEnergy).toFixed(4)) : 0
}

export function computeAmbientAudioMetrics(audio: PcmAudio): AmbientAudioMetrics {
  const normalized = normalize(audio.samples)

  let sumSquares = 0
  let peak = 0
  let clippedCount = 0
  for (const value of normalized) {
    sumSquares += value * value
    const abs = Math.abs(value)
    if (abs > peak) peak = abs
    if (abs >= CLIPPING_THRESHOLD) clippedCount++
  }
  const rms = Math.sqrt(sumSquares / normalized.length)

  const windowRms = windowedRms(normalized, audio.sampleRateHz, WINDOW_MS)
  const silentWindows = windowRms.filter((value) => value < SILENCE_RMS_THRESHOLD).length
  const sortedRms = [...windowRms].sort((a, b) => a - b)
  const noiseFloorEstimate = sortedRms[Math.floor(sortedRms.length * 0.1)] ?? 0

  const targetRateHz = 500
  const decimated = decimate(normalized, audio.sampleRateHz, targetRateHz)
  const effectiveRateHz = audio.sampleRateHz / Math.max(1, Math.round(audio.sampleRateHz / targetRateHz))
  const windLikeLowFrequencyEnergy = lowFrequencyEnergyRatio(decimated, effectiveRateHz)

  return {
    rms: Number(rms.toFixed(4)),
    peak: Number(peak.toFixed(4)),
    noiseFloorEstimate: Number(noiseFloorEstimate.toFixed(4)),
    clippingRatio: Number((clippedCount / normalized.length).toFixed(4)),
    silenceRatio: Number((silentWindows / windowRms.length).toFixed(4)),
    windLikeLowFrequencyEnergy,
  }
}
