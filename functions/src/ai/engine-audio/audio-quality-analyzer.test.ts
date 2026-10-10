import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeAudioQuality } from './audio-quality-analyzer'
import { ENGINE_AUDIO_CONFIG } from './engine-audio.config'

function silence(durationMs: number, sampleRateHz: number): Float32Array {
  return new Float32Array(Math.round((durationMs / 1000) * sampleRateHz))
}

function sineWave(freqHz: number, durationMs: number, sampleRateHz: number, amplitude = 0.5): Float32Array {
  const n = Math.round((durationMs / 1000) * sampleRateHz)
  const samples = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    samples[i] = amplitude * Math.sin((2 * Math.PI * freqHz * i) / sampleRateHz)
  }
  return samples
}

function clippedSquareWave(durationMs: number, sampleRateHz: number): Float32Array {
  const n = Math.round((durationMs / 1000) * sampleRateHz)
  const samples = new Float32Array(n)
  for (let i = 0; i < n; i++) samples[i] = i % 2 === 0 ? 0.999 : -0.999
  return samples
}

test('CASE 2 (spec §28) — an all-silent recording is unusable, never engine-detected', () => {
  const assessment = analyzeAudioQuality(silence(2000, ENGINE_AUDIO_CONFIG.sampleRateHz), ENGINE_AUDIO_CONFIG)
  assert.equal(assessment.usable, false)
  assert.equal(assessment.engineDetected, false)
  assert.equal(assessment.audioQuality, 'unusable')
  assert.equal(assessment.silenceRatio, 1)
})

test('CASE 10 (spec §28) — severe clipping makes the recording unusable', () => {
  const assessment = analyzeAudioQuality(
    clippedSquareWave(2000, ENGINE_AUDIO_CONFIG.sampleRateHz),
    ENGINE_AUDIO_CONFIG,
  )
  assert.equal(assessment.usable, false)
  assert.equal(assessment.audioQuality, 'unusable')
  assert.ok(assessment.clippingRatio > ENGINE_AUDIO_CONFIG.maxClippingRatioForUsable)
})

test('a clean audible tone is usable and flagged as engine-detected', () => {
  const assessment = analyzeAudioQuality(
    sineWave(300, 2000, ENGINE_AUDIO_CONFIG.sampleRateHz),
    ENGINE_AUDIO_CONFIG,
  )
  assert.equal(assessment.usable, true)
  assert.equal(assessment.engineDetected, true)
  assert.equal(assessment.silenceRatio, 0)
  assert.equal(assessment.clippingRatio, 0)
})

test('an empty buffer is unusable without throwing', () => {
  const assessment = analyzeAudioQuality(new Float32Array(0), ENGINE_AUDIO_CONFIG)
  assert.equal(assessment.usable, false)
  assert.equal(assessment.audioQuality, 'unusable')
})
