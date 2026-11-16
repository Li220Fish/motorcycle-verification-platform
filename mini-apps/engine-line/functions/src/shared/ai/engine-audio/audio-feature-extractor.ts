import {
  applyHannWindow,
  computeMagnitudeSpectrum,
  dominantFrequency,
  harmonicEnergy,
  spectralBandwidth,
  spectralCentroid,
  spectralEntropy,
  spectralFlatness,
  spectralFlux,
  type SpectrumBin,
} from './dft'
import { EngineAudioConfig } from './engine-audio.config'
import { PreprocessedAudio } from './audio-preprocessor'
import { peakAmplitude, rms, sliceWindows } from './windowing'

export const AUDIO_FEATURE_VERSION = 'audio-feature-v1'

export interface EngineSessionPhaseBounds {
  startMs: number
  endMs: number
}
export interface EngineSessionPhases {
  startup: EngineSessionPhaseBounds
  idle: EngineSessionPhaseBounds
  rev: EngineSessionPhaseBounds
}

/** One 250ms (config-driven) analysis window's full feature set — time-
 *  domain features from the RAW path, frequency-domain features from the
 *  NORMALIZED path (see audio-preprocessor.ts's own doc comment for why
 *  the two paths exist). */
export interface WindowFeatures {
  startMs: number
  endMs: number
  rms: number
  peak: number
  crestFactor: number
  zeroCrossingRate: number
  dominantFrequencyHz: number
  spectralCentroidHz: number
  spectralBandwidthHz: number
  spectralFlux: number
  spectralFlatness: number
  spectralEntropy: number
  harmonicEnergy: number
}

/** Per-phase aggregate — this is the compact "DSP Summary" shape actually
 *  persisted (spec §23's `dspSummary`), never the full per-window timeline
 *  (kept only in-memory for event detection, spec §19: "不要傳大量 raw DSP
 *  arrays"). */
export interface PhaseFeatureSummary {
  windowCount: number
  meanRms: number
  rmsVariationCv: number
  meanPeak: number
  meanCrestFactor: number
  meanZeroCrossingRate: number
  meanDominantFrequencyHz: number
  meanSpectralCentroidHz: number
  meanSpectralBandwidthHz: number
  meanSpectralFlux: number
  meanSpectralFlatness: number
  meanSpectralEntropy: number
  meanHarmonicEnergy: number
}

export interface AudioFeatureTimeline {
  /** In-memory only — never persisted whole (see PhaseFeatureSummary doc
   *  comment above); consumed by engine-presence-detector.ts and
   *  engine-event-detector.ts. */
  windows: WindowFeatures[]
  phases: {
    startup: PhaseFeatureSummary
    idle: PhaseFeatureSummary
    rev: PhaseFeatureSummary
  }
}

function zeroCrossingRate(samples: Float32Array): number {
  if (samples.length < 2) return 0
  let crossings = 0
  for (let i = 1; i < samples.length; i++) {
    if ((samples[i - 1] >= 0 && samples[i] < 0) || (samples[i - 1] < 0 && samples[i] >= 0)) {
      crossings++
    }
  }
  return crossings / (samples.length - 1)
}

function mean(values: number[]): number {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0
}
function coefficientOfVariation(values: number[]): number {
  const m = mean(values)
  if (m <= 0) return 0
  const variance = mean(values.map((v) => (v - m) ** 2))
  return Math.sqrt(variance) / m
}

function summarizePhase(windows: WindowFeatures[]): PhaseFeatureSummary {
  return {
    windowCount: windows.length,
    meanRms: mean(windows.map((w) => w.rms)),
    rmsVariationCv: coefficientOfVariation(windows.map((w) => w.rms)),
    meanPeak: mean(windows.map((w) => w.peak)),
    meanCrestFactor: mean(windows.map((w) => w.crestFactor)),
    meanZeroCrossingRate: mean(windows.map((w) => w.zeroCrossingRate)),
    meanDominantFrequencyHz: mean(windows.map((w) => w.dominantFrequencyHz)),
    meanSpectralCentroidHz: mean(windows.map((w) => w.spectralCentroidHz)),
    meanSpectralBandwidthHz: mean(windows.map((w) => w.spectralBandwidthHz)),
    meanSpectralFlux: mean(windows.map((w) => w.spectralFlux)),
    meanSpectralFlatness: mean(windows.map((w) => w.spectralFlatness)),
    meanSpectralEntropy: mean(windows.map((w) => w.spectralEntropy)),
    meanHarmonicEnergy: mean(windows.map((w) => w.harmonicEnergy)),
  }
}

function windowsInPhase(windows: WindowFeatures[], bounds: EngineSessionPhaseBounds): WindowFeatures[] {
  return windows.filter((w) => w.startMs >= bounds.startMs && w.startMs < bounds.endMs)
}

/**
 * AudioFeatureExtractor stage (spec §8). Slices both preprocessed paths into
 * identical overlapping windows, computes time-domain features from the raw
 * path and frequency-domain features (via dft.ts) from the normalized path,
 * then aggregates per-phase summaries using the system-truth phase
 * boundaries (never re-derived — same discipline as the IMU pipeline's
 * sliceSamples).
 */
export function extractAudioFeatures(
  pre: PreprocessedAudio,
  phases: EngineSessionPhases,
  config: EngineAudioConfig,
): AudioFeatureTimeline {
  const rawWindows = sliceWindows(pre.raw, pre.sampleRateHz, config.windowMs, config.hopMs)
  const normalizedWindows = sliceWindows(pre.normalized, pre.sampleRateHz, config.windowMs, config.hopMs)

  let previousSpectrum: SpectrumBin[] = []
  const windows: WindowFeatures[] = rawWindows.map((rawWindow, i) => {
    const normalizedWindow = normalizedWindows[i]
    const windowed = applyHannWindow(normalizedWindow.samples)
    const spectrum = computeMagnitudeSpectrum(
      windowed,
      pre.sampleRateHz,
      config.maxFrequencyHz,
      config.frequencyBinHz,
    )
    const dominantHz = dominantFrequency(spectrum)
    const centroidHz = spectralCentroid(spectrum)
    const flux = spectralFlux(previousSpectrum, spectrum)
    previousSpectrum = spectrum

    const windowRms = rms(rawWindow.samples)
    const windowPeak = peakAmplitude(rawWindow.samples)

    return {
      startMs: rawWindow.startMs,
      endMs: rawWindow.endMs,
      rms: windowRms,
      peak: windowPeak,
      crestFactor: windowRms > 0 ? windowPeak / windowRms : 0,
      zeroCrossingRate: zeroCrossingRate(rawWindow.samples),
      dominantFrequencyHz: dominantHz,
      spectralCentroidHz: centroidHz,
      spectralBandwidthHz: spectralBandwidth(spectrum, centroidHz),
      spectralFlux: flux,
      spectralFlatness: spectralFlatness(spectrum),
      spectralEntropy: spectralEntropy(spectrum),
      harmonicEnergy: harmonicEnergy(spectrum, dominantHz),
    }
  })

  return {
    windows,
    phases: {
      startup: summarizePhase(windowsInPhase(windows, phases.startup)),
      idle: summarizePhase(windowsInPhase(windows, phases.idle)),
      rev: summarizePhase(windowsInPhase(windows, phases.rev)),
    },
  }
}
