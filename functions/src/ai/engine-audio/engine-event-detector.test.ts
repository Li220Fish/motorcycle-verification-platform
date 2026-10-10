import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectEngineEvents } from './engine-event-detector'
import { AudioFeatureTimeline, EngineSessionPhases, WindowFeatures } from './audio-feature-extractor'
import { PresenceAssessment } from './engine-presence-detector'
import { ENGINE_AUDIO_CONFIG } from './engine-audio.config'

const PHASES: EngineSessionPhases = {
  startup: { startMs: 0, endMs: 5000 },
  idle: { startMs: 5000, endMs: 14000 },
  rev: { startMs: 14000, endMs: 23000 },
}

function baseWindow(startMs: number, overrides: Partial<WindowFeatures> = {}): WindowFeatures {
  return {
    startMs,
    endMs: startMs + ENGINE_AUDIO_CONFIG.windowMs,
    rms: 0.3,
    peak: 0.5,
    crestFactor: 1.7,
    zeroCrossingRate: 0.1,
    dominantFrequencyHz: 150,
    spectralCentroidHz: 400,
    spectralBandwidthHz: 300,
    spectralFlux: 0.01,
    spectralFlatness: 0.2,
    spectralEntropy: 0.4,
    harmonicEnergy: 0.5,
    ...overrides,
  }
}

function buildTimeline(windows: WindowFeatures[]): AudioFeatureTimeline {
  const summarize = () => ({
    windowCount: 0,
    meanRms: 0,
    rmsVariationCv: 0,
    meanPeak: 0,
    meanCrestFactor: 0,
    meanZeroCrossingRate: 0,
    meanDominantFrequencyHz: 0,
    meanSpectralCentroidHz: 0,
    meanSpectralBandwidthHz: 0,
    meanSpectralFlux: 0,
    meanSpectralFlatness: 0,
    meanSpectralEntropy: 0,
    meanHarmonicEnergy: 0,
  })
  return { windows, phases: { startup: summarize(), idle: summarize(), rev: summarize() } }
}

function presenceFor(windows: WindowFeatures[], runningFrom: number | null): PresenceAssessment {
  const windowPresenceProbability = windows.map((w) =>
    runningFrom !== null && w.startMs >= runningFrom ? 0.9 : 0.1,
  )
  function ratio(bounds: { startMs: number; endMs: number }): number {
    const inPhase = windows
      .map((w, i) => ({ w, score: windowPresenceProbability[i] }))
      .filter(({ w }) => w.startMs >= bounds.startMs && w.startMs < bounds.endMs)
    if (inPhase.length === 0) return 0
    return inPhase.filter(({ score }) => score >= ENGINE_AUDIO_CONFIG.presenceProbabilityThreshold).length / inPhase.length
  }
  return {
    windowPresenceProbability,
    phases: { startup: ratio(PHASES.startup), idle: ratio(PHASES.idle), rev: ratio(PHASES.rev) },
  }
}

test('CASE 9 — repeated periodic high-frequency spikes are flagged as mechanical_tapping', () => {
  const windows: WindowFeatures[] = []
  // Idle phase (5000-14000ms), engine running throughout, with a sharp
  // spectral-flux spike every ~1000ms — a repeating pattern, not one-off.
  for (let t = 5000; t < 14000; t += ENGINE_AUDIO_CONFIG.hopMs) {
    const isSpike = Math.round((t - 5000) / 1000) % 1 === 0 && (t - 5000) % 1000 < ENGINE_AUDIO_CONFIG.hopMs
    windows.push(baseWindow(t, { spectralFlux: isSpike ? 5 : 0.01 }))
  }
  const timeline = buildTimeline(windows)
  const presence = presenceFor(windows, 0)
  const events = detectEngineEvents(timeline, presence, PHASES, ENGINE_AUDIO_CONFIG)
  assert.ok(
    events.some((e) => e.type === 'mechanical_tapping'),
    `expected a mechanical_tapping event, got: ${JSON.stringify(events.map((e) => e.type))}`,
  )
})

test('a single one-off spike is a sharp_transient but NOT mechanical_tapping', () => {
  const windows: WindowFeatures[] = []
  for (let t = 5000; t < 14000; t += ENGINE_AUDIO_CONFIG.hopMs) {
    windows.push(baseWindow(t, { spectralFlux: t === 9000 ? 5 : 0.01 }))
  }
  const timeline = buildTimeline(windows)
  const presence = presenceFor(windows, 0)
  const events = detectEngineEvents(timeline, presence, PHASES, ENGINE_AUDIO_CONFIG)
  assert.ok(events.some((e) => e.type === 'sharp_transient'))
  assert.ok(!events.some((e) => e.type === 'mechanical_tapping'))
})

test('CASE 5 (event level) — a sustained mid-idle presence drop is detected as engine_stall', () => {
  const windows: WindowFeatures[] = []
  for (let t = 0; t < 23000; t += ENGINE_AUDIO_CONFIG.hopMs) windows.push(baseWindow(t))
  const timeline = buildTimeline(windows)
  // Running from t=0, but drops out for a full 2s in the middle of idle.
  const windowPresenceProbability = windows.map((w) => (w.startMs >= 8000 && w.startMs < 10000 ? 0.1 : 0.9))
  const presence: PresenceAssessment = {
    windowPresenceProbability,
    phases: { startup: 0.9, idle: 0.8, rev: 0.9 },
  }
  const events = detectEngineEvents(timeline, presence, PHASES, ENGINE_AUDIO_CONFIG)
  const stall = events.find((e) => e.type === 'engine_stall')
  assert.ok(stall, `expected an engine_stall event, got: ${JSON.stringify(events.map((e) => e.type))}`)
  assert.ok(stall!.timeMs >= 7900 && stall!.timeMs <= 8200)
})

test('throttle_increase fires when rev-phase RMS clears the configured ratio over idle baseline', () => {
  const windows: WindowFeatures[] = []
  for (let t = 0; t < 5000; t += ENGINE_AUDIO_CONFIG.hopMs) windows.push(baseWindow(t, { rms: 0.3 }))
  for (let t = 5000; t < 14000; t += ENGINE_AUDIO_CONFIG.hopMs) windows.push(baseWindow(t, { rms: 0.3 }))
  for (let t = 14000; t < 23000; t += ENGINE_AUDIO_CONFIG.hopMs) windows.push(baseWindow(t, { rms: 0.5 }))
  const timeline = buildTimeline(windows)
  const presence = presenceFor(windows, 0)
  const events = detectEngineEvents(timeline, presence, PHASES, ENGINE_AUDIO_CONFIG)
  assert.ok(events.some((e) => e.type === 'throttle_increase'))
  assert.ok(events.some((e) => e.type === 'engine_speed_related_rise'))
})
