import { test } from 'node:test'
import assert from 'node:assert/strict'

import { extractImuFeatures } from './imu-feature-extractor'
import { preprocessImu, type ImuSample, type ImuSessionJson } from './imu-preprocessor'
import { classifyIdleStability, classifyRevStability } from './imu-stability-classifier'
import { IMU_THRESHOLDS } from './imu-thresholds-v1'

function session(
  durationMs: number,
  rateHz: number,
  sample: (tMs: number, i: number) => Partial<ImuSample>,
): ImuSessionJson {
  const n = Math.round((durationMs / 1000) * rateHz)
  const samples: ImuSample[] = []
  for (let i = 0; i < n; i++) {
    const tMs = (i * 1000) / rateHz
    samples.push({ tMs, ax: 0, ay: 0, az: 9.8, gx: 0, gy: 0, gz: 0, ...sample(tMs, i) })
  }
  return {
    schemaVersion: 1,
    sessionType: 'idle',
    durationMs,
    placement: 'seat',
    orientation: 'flat',
    targetSampleRateHz: rateHz,
    samples,
  }
}

const steadyVibration = (tMs: number) => ({ ax: 0.2 * Math.sin((2 * Math.PI * 25 * tMs) / 1000) })

test('preprocessImu removes per-axis mean (gravity) and drops non-finite samples', () => {
  const raw = session(1000, 10, (_t, i) => (i === 3 ? { ax: Number.NaN } : { ax: 1 }))
  const pre = preprocessImu(raw)
  assert.equal(pre.sampleCount, 9)
  assert.ok(Math.abs(pre.missingRatio - 0.1) < 1e-9)
  assert.equal(pre.effectiveSampleRateHz, 9)
  assert.ok(pre.az.every((v) => Math.abs(v) < 1e-9))
  assert.ok(pre.ax.every((v) => Math.abs(v) < 1e-9))
})

test('preprocessImu with no samples → missingRatio 1, rate 0', () => {
  const pre = preprocessImu({ ...session(1000, 10, () => ({})), samples: [] })
  assert.equal(pre.sampleCount, 0)
  assert.equal(pre.missingRatio, 1)
  const zeroDuration = preprocessImu({ ...session(1000, 10, () => ({})), durationMs: 0 })
  assert.equal(zeroDuration.effectiveSampleRateHz, 0)
})

test('extractImuFeatures: steady vibration → low rmsCv and a dominant frequency', () => {
  const pre = preprocessImu(session(10_000, 100, steadyVibration))
  const f = extractImuFeatures(pre, 10_000)
  assert.equal(f.durationMs, 10_000)
  assert.ok(f.accelerometer.rms > 0)
  assert.ok(f.accelerometer.rmsCv < IMU_THRESHOLDS.idleUnstableRmsCv)
  assert.ok(f.accelerometer.dominantFrequencyHz > 0 && f.accelerometer.dominantFrequencyHz <= 30)
  assert.ok(f.accelerometer.spectralEntropy >= 0 && f.accelerometer.spectralEntropy <= 1)
  assert.equal(f.quality.phoneMovementDetected, false)
})

test('extractImuFeatures flags a large gyroscope swing as phone movement', () => {
  const pre = preprocessImu(
    session(5000, 100, (t) => ({ ...steadyVibration(t), gx: t > 2500 ? 90 : 0 })),
  )
  assert.equal(extractImuFeatures(pre, 5000).quality.phoneMovementDetected, true)
})

test('extractImuFeatures on an empty session is all zeros', () => {
  const f = extractImuFeatures(preprocessImu({ ...session(1000, 10, () => ({})), samples: [] }), 0)
  assert.equal(f.accelerometer.rms, 0)
  assert.equal(f.accelerometer.dominantFrequencyHz, 0)
  assert.equal(f.accelerometer.spectralEntropy, 0)
})

test('classifyIdleStability: steady → normal', () => {
  const f = extractImuFeatures(preprocessImu(session(10_000, 100, steadyVibration)), 10_000)
  assert.deepEqual(classifyIdleStability(f), { result: 'normal', note: null })
})

test('classifyIdleStability: bursty vibration → attention, with a note', () => {
  // Strong vibration only in some 1-second windows → high window-to-window variation.
  const bursty = (tMs: number) => ({
    ax: Math.floor(tMs / 1000) % 3 === 0 ? 3 * Math.sin(tMs) : 0.05 * Math.sin(tMs),
  })
  const f = extractImuFeatures(preprocessImu(session(10_000, 100, bursty)), 10_000)
  const r = classifyIdleStability(f)
  assert.equal(r.result, 'attention')
  assert.ok(r.note && r.note.includes('怠速'))
})

test('quality gate → unsure (too few samples, low rate, too much missing, phone moved)', () => {
  const tooShort = extractImuFeatures(preprocessImu(session(1000, 30, steadyVibration)), 1000)
  assert.equal(classifyIdleStability(tooShort).result, 'unsure')
  const lowRate = extractImuFeatures(preprocessImu(session(10_000, 10, steadyVibration)), 10_000)
  assert.equal(classifyRevStability(lowRate).result, 'unsure')
  const missing = extractImuFeatures(
    preprocessImu(
      session(10_000, 100, (t, i) => (i % 2 ? { ax: Number.NaN } : steadyVibration(t))),
    ),
    10_000,
  )
  assert.equal(classifyIdleStability(missing).result, 'unsure')
  const moved = extractImuFeatures(
    preprocessImu(session(10_000, 100, (t) => ({ ...steadyVibration(t), gz: t > 5000 ? 100 : 0 }))),
    10_000,
  )
  const r = classifyIdleStability(moved)
  assert.equal(r.result, 'unsure')
  assert.ok(r.note!.includes('手機'))
})

test('rev uses a looser threshold than idle', () => {
  assert.ok(IMU_THRESHOLDS.revUnstableRmsCv > IMU_THRESHOLDS.idleUnstableRmsCv)
  const fake = (rmsCv: number) => ({
    durationMs: 10_000,
    accelerometer: {
      rms: 1,
      std: 1,
      peakToPeak: 1,
      rmsCv,
      dominantFrequencyHz: 10,
      spectralEntropy: 0.5,
    },
    gyroscope: { rms: 0, std: 0, peakToPeak: 0 },
    quality: {
      sampleCount: 1000,
      effectiveSampleRateHz: 100,
      missingRatio: 0,
      phoneMovementDetected: false,
    },
  })
  const between = (IMU_THRESHOLDS.idleUnstableRmsCv + IMU_THRESHOLDS.revUnstableRmsCv) / 2
  assert.equal(classifyIdleStability(fake(between)).result, 'attention')
  assert.equal(classifyRevStability(fake(between)).result, 'normal')
  assert.equal(classifyRevStability(fake(1)).result, 'attention')
})
