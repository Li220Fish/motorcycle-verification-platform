import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectEngineEvents } from './engine-event-detector'
import { AudioFeatureTimeline, EngineSessionPhases, WindowFeatures } from './audio-feature-extractor'
import { PresenceAssessment } from './engine-presence-detector'
import { ENGINE_AUDIO_CONFIG } from './engine-audio.config'

/**
 * 熱車檢查's `assumeAlreadyRunning: true` path — no startup phase at all
 * (HOT_ENGINE_SESSION_PHASES's zero-width `startup`), the engine is already
 * confirmed running for the whole recording. The behavior this actually
 * needs to prove: idle/rev stall detection still fires WITHOUT ever running
 * detectStartupEvents — without the flag, `hadSustainedRunning` would stay
 * false (no cranking/ignition ever observed in a 2-phase recording with no
 * startup window data) and detectStallEvents would be skipped entirely,
 * silently missing a real stall.
 */

const HOT_PHASES: EngineSessionPhases = {
  startup: { startMs: 0, endMs: 0 },
  idle: { startMs: 0, endMs: 9000 },
  rev: { startMs: 9000, endMs: 18000 },
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

test('assumeAlreadyRunning=false (default) with no startup window data: no stall detected even for a real dropout', () => {
  const windows: WindowFeatures[] = []
  for (let t = 0; t < 18000; t += ENGINE_AUDIO_CONFIG.hopMs) windows.push(baseWindow(t))
  const timeline = buildTimeline(windows)
  const windowPresenceProbability = windows.map((w) => (w.startMs >= 3000 && w.startMs < 5000 ? 0.1 : 0.9))
  const presence: PresenceAssessment = {
    windowPresenceProbability,
    phases: { startup: 0, idle: 0.7, rev: 0.9 },
  }
  const events = detectEngineEvents(timeline, presence, HOT_PHASES, ENGINE_AUDIO_CONFIG)
  // Without assumeAlreadyRunning, detectStartupEvents finds no cranking/
  // ignition in a zero-width startup window, so hadSustainedRunning stays
  // false and detectStallEvents is skipped outright — the real dropout at
  // 3-5s goes completely unreported. This is the exact bug the hot pipeline
  // must avoid by passing assumeAlreadyRunning=true (see the next test).
  assert.ok(!events.some((e) => e.type === 'engine_stall'))
})

test('assumeAlreadyRunning=true: a mid-idle dropout is correctly detected as engine_stall', () => {
  const windows: WindowFeatures[] = []
  for (let t = 0; t < 18000; t += ENGINE_AUDIO_CONFIG.hopMs) windows.push(baseWindow(t))
  const timeline = buildTimeline(windows)
  const windowPresenceProbability = windows.map((w) => (w.startMs >= 3000 && w.startMs < 5000 ? 0.1 : 0.9))
  const presence: PresenceAssessment = {
    windowPresenceProbability,
    phases: { startup: 0, idle: 0.7, rev: 0.9 },
  }
  const events = detectEngineEvents(timeline, presence, HOT_PHASES, ENGINE_AUDIO_CONFIG, true)
  assert.ok(events.some((e) => e.type === 'sustained_engine_running' && e.timeMs === 0))
  assert.ok(!events.some((e) => e.type === 'starter_engagement'))
  const stall = events.find((e) => e.type === 'engine_stall')
  assert.ok(stall, `expected an engine_stall event, got: ${JSON.stringify(events.map((e) => e.type))}`)
  assert.ok(stall!.timeMs >= 2900 && stall!.timeMs <= 3200)
})

test('assumeAlreadyRunning=true: throttle_increase still fires for a real rev', () => {
  const windows: WindowFeatures[] = []
  for (let t = 0; t < 9000; t += ENGINE_AUDIO_CONFIG.hopMs) windows.push(baseWindow(t, { rms: 0.3 }))
  for (let t = 9000; t < 18000; t += ENGINE_AUDIO_CONFIG.hopMs) windows.push(baseWindow(t, { rms: 0.5 }))
  const timeline = buildTimeline(windows)
  const windowPresenceProbability = windows.map(() => 0.9)
  const presence: PresenceAssessment = {
    windowPresenceProbability,
    phases: { startup: 0, idle: 0.9, rev: 0.9 },
  }
  const events = detectEngineEvents(timeline, presence, HOT_PHASES, ENGINE_AUDIO_CONFIG, true)
  assert.ok(events.some((e) => e.type === 'throttle_increase'))
})
