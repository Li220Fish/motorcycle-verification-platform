import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectTransients } from './transient-detector'
import { preprocessAudio } from './audio-preprocessor'
import { ENGINE_AUDIO_CONFIG } from './engine-audio.config'
import type { EngineSessionPhases } from './audio-feature-extractor'

const FS = ENGINE_AUDIO_CONFIG.sampleRateHz
const PHASES: EngineSessionPhases = {
  startup: { startMs: 0, endMs: 5000 },
  idle: { startMs: 5000, endMs: 14000 },
  rev: { startMs: 14000, endMs: 23000 },
}
const DURATION_MS = 23000

function deterministicRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    return state / 0x7fffffff
  }
}

/**
 * Engine-like background: a low firing fundamental with harmonics plus
 * broadband noise. Deliberately dominated by low frequencies, because that is
 * the property of real idle audio (83-93% of energy below 500 Hz) that makes
 * transients invisible without band-limiting.
 */
function engineBackground(durationMs: number, { unsteady = false } = {}): Float32Array {
  const n = Math.round((durationMs / 1000) * FS)
  const samples = new Float32Array(n)
  const random = deterministicRandom(7)
  for (let i = 0; i < n; i++) {
    const t = i / FS
    const amplitudeDrift = unsteady ? 1 + 0.9 * Math.sin(2 * Math.PI * 0.7 * t) : 1
    const fundamental = Math.sin(2 * Math.PI * 38 * t)
    const harmonic2 = 0.5 * Math.sin(2 * Math.PI * 76 * t)
    const harmonic3 = 0.25 * Math.sin(2 * Math.PI * 114 * t)
    const noise = 0.06 * (random() * 2 - 1)
    samples[i] = 0.25 * amplitudeDrift * (fundamental + harmonic2 + harmonic3) + noise
  }
  return samples
}

/** A metallic tap: fast-decaying resonances in the 3-7 kHz region. */
function addTap(samples: Float32Array, atMs: number, amplitude: number): void {
  const start = Math.round((atMs / 1000) * FS)
  const length = Math.round(0.008 * FS)
  for (let i = 0; i < length && start + i < samples.length; i++) {
    const t = i / FS
    const envelope = Math.exp(-450 * t)
    const resonance =
      (Math.sin(2 * Math.PI * 3200 * t) +
        Math.sin(2 * Math.PI * 4700 * t) +
        Math.sin(2 * Math.PI * 6300 * t)) /
      3
    samples[start + i] += amplitude * envelope * resonance
  }
}

function runDetector(samples: Float32Array, idleRmsCv: number) {
  const preprocessed = preprocessAudio({ samples, sampleRateHz: FS }, ENGINE_AUDIO_CONFIG)
  return detectTransients(
    preprocessed.transientBand,
    preprocessed.sampleRateHz,
    PHASES,
    idleRmsCv,
    ENGINE_AUDIO_CONFIG,
  )
}

test('a steady idle with no taps produces no transient events', () => {
  const result = runDetector(engineBackground(DURATION_MS), 0.03)
  assert.equal(result.idle.analyzed, true)
  assert.equal(
    result.idle.events.length,
    0,
    `expected a clean idle to stay clean, got ${result.idle.events.length} events (maxZ ${result.idle.maxZ})`,
  )
  assert.equal(result.idle.repeating, false)
})

test('repeated metallic taps in the idle phase are detected and flagged as repeating', () => {
  const samples = engineBackground(DURATION_MS)
  // 8 taps at a regular 900 ms interval, the shape of a mechanical knock
  // tied to engine rotation rather than an incidental one-off bump.
  for (let k = 0; k < 8; k++) addTap(samples, 5600 + k * 900, 0.35)

  const result = runDetector(samples, 0.03)
  assert.equal(result.idle.analyzed, true)
  assert.ok(
    result.idle.events.length >= 6,
    `expected most of the 8 injected taps to be found, got ${result.idle.events.length}`,
  )
  assert.equal(result.idle.repeating, true, 'evenly spaced taps must be reported as repeating')
})

test('a single one-off bump is reported but NOT as repeating', () => {
  const samples = engineBackground(DURATION_MS)
  addTap(samples, 8000, 0.35)

  const result = runDetector(samples, 0.03)
  assert.ok(result.idle.events.length >= 1, 'the bump itself should still surface')
  assert.equal(
    result.idle.repeating,
    false,
    'one bump is not a mechanical knock and must not be reported as one',
  )
})

test('an idle too unsteady to measure reports analyzed:false, never a clean result', () => {
  const samples = engineBackground(DURATION_MS, { unsteady: true })
  for (let k = 0; k < 8; k++) addTap(samples, 5600 + k * 900, 0.35)

  // idleRmsCv above the configured ceiling — what the quality analyzer would
  // report for this recording.
  const result = runDetector(samples, 0.35)
  assert.equal(result.idle.analyzed, false)
  assert.ok(result.idle.notAnalyzedReason, 'an unmeasurable phase must say why')
  assert.equal(result.idle.events.length, 0)
  // The rev phase has no such gate and is still analysed.
  assert.equal(result.rev.analyzed, true)
})

test('taps are found through the band-pass even though the background is low-frequency dominated', () => {
  // Guards the specific failure the second path exists to fix: without band
  // limiting, sub-500 Hz energy dominates every window's spectral flux and the
  // tap never becomes an outlier. If the band-pass were lost, the tap's
  // z-score would collapse toward the background and this would fail.
  const samples = engineBackground(DURATION_MS)
  for (let k = 0; k < 8; k++) addTap(samples, 5600 + k * 900, 0.35)
  const result = runDetector(samples, 0.03)
  assert.ok(
    result.idle.maxZ > ENGINE_AUDIO_CONFIG.transientZThreshold,
    `tap should stand clearly above the threshold, maxZ was ${result.idle.maxZ}`,
  )
})
