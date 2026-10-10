import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  applyHannWindow,
  computeMagnitudeSpectrum,
  dominantFrequency,
  spectralCentroid,
  spectralFlatness,
} from './dft'

const SAMPLE_RATE_HZ = 22050

function sineWave(freqHz: number, durationMs: number, sampleRateHz: number, amplitude = 1): Float32Array {
  const n = Math.round((durationMs / 1000) * sampleRateHz)
  const samples = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    samples[i] = amplitude * Math.sin((2 * Math.PI * freqHz * i) / sampleRateHz)
  }
  return samples
}

function whiteNoise(durationMs: number, sampleRateHz: number, seed = 1): Float32Array {
  const n = Math.round((durationMs / 1000) * sampleRateHz)
  const samples = new Float32Array(n)
  let state = seed
  for (let i = 0; i < n; i++) {
    // Deterministic pseudo-random generator so the test is reproducible.
    state = (state * 1103515245 + 12345) & 0x7fffffff
    samples[i] = (state / 0x7fffffff) * 2 - 1
  }
  return samples
}

test('computeMagnitudeSpectrum finds the correct dominant frequency for a pure tone', () => {
  const toneHz = 440
  const samples = sineWave(toneHz, 250, SAMPLE_RATE_HZ)
  const windowed = applyHannWindow(samples)
  const spectrum = computeMagnitudeSpectrum(windowed, SAMPLE_RATE_HZ, 5000, 25)
  const dominantHz = dominantFrequency(spectrum)
  // Bin resolution is 25Hz — within one bin of the true tone.
  assert.ok(Math.abs(dominantHz - toneHz) <= 25, `expected ~${toneHz}Hz, got ${dominantHz}Hz`)
})

test('a pure tone has much lower spectral flatness than white noise', () => {
  const tone = applyHannWindow(sineWave(300, 250, SAMPLE_RATE_HZ))
  const noise = applyHannWindow(whiteNoise(250, SAMPLE_RATE_HZ))

  const toneSpectrum = computeMagnitudeSpectrum(tone, SAMPLE_RATE_HZ, 5000, 25)
  const noiseSpectrum = computeMagnitudeSpectrum(noise, SAMPLE_RATE_HZ, 5000, 25)

  const toneFlatness = spectralFlatness(toneSpectrum)
  const noiseFlatness = spectralFlatness(noiseSpectrum)

  assert.ok(
    toneFlatness < noiseFlatness,
    `expected tone flatness (${toneFlatness}) < noise flatness (${noiseFlatness})`,
  )
})

test('spectralCentroid shifts higher for a higher-frequency tone', () => {
  const low = applyHannWindow(sineWave(200, 250, SAMPLE_RATE_HZ))
  const high = applyHannWindow(sineWave(2000, 250, SAMPLE_RATE_HZ))
  const lowCentroid = spectralCentroid(computeMagnitudeSpectrum(low, SAMPLE_RATE_HZ, 5000, 25))
  const highCentroid = spectralCentroid(computeMagnitudeSpectrum(high, SAMPLE_RATE_HZ, 5000, 25))
  assert.ok(highCentroid > lowCentroid)
})

test('computeMagnitudeSpectrum returns [] for a window too short to analyze', () => {
  const spectrum = computeMagnitudeSpectrum(new Float32Array([0, 1]), SAMPLE_RATE_HZ, 5000, 25)
  assert.deepEqual(spectrum, [])
})
