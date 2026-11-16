import {
  accel,
  mean,
  meanVec,
  norm,
  STANDARD_GRAVITY,
  vibrationRms,
  type ImuSample,
  type Vec3,
} from './imu'

/**
 * 基準值校正 — RiDE's hot-engine session timeline (engine already running,
 * no cold start): 0–9 s steady idle, 9–18 s gentle revs, phone fixed where
 * it will ride. The idle window gives the phone's mounting orientation
 * (gravity vector) and the engine's own vibration floor, which the game
 * subtracts so a buzzy single-cylinder doesn't "break the tofu" at a
 * standstill.
 */
export const CALIBRATION_DURATION_MS = 18000
export const CALIBRATION_PHASES = {
  idle: { startMs: 0, endMs: 9000 },
  rev: { startMs: 9000, endMs: 18000 },
} as const

export const CALIBRATION_INSTRUCTIONS = [
  { atSeconds: 0, label: '保持怠速，不要碰手機' },
  { atSeconds: 9, label: '輕輕催油門幾下' },
] as const

export function instructionAt(elapsedSeconds: number): string {
  let label: string = CALIBRATION_INSTRUCTIONS[0].label
  for (const step of CALIBRATION_INSTRUCTIONS) if (elapsedSeconds >= step.atSeconds) label = step.label
  return label
}

export interface AudioLevels {
  idleDb: number | null
  revDb: number | null
}

export interface Baseline {
  version: 1
  /** Mean accelerometer vector at idle (m/s², phone axes) — mounting orientation. */
  gravity: Vec3
  gravityMagnitude: number
  /** Engine vibration RMS with gravity removed (m/s²). */
  idleVibration: number
  revVibration: number
  /** Mean rotation-rate magnitude at idle (deg/s) — high means the phone wasn't fixed. */
  idleRotation: number
  sampleRateHz: number
  idleSampleCount: number
  revSampleCount: number
  audio: AudioLevels
  quality: {
    engineDetected: boolean
    phoneStable: boolean
    revDetected: boolean
    warnings: string[]
  }
}

/** Phone lying on a desk sits around 0.01–0.03 m/s²; any running engine
 *  transmits well above this through the frame. */
const ENGINE_VIBRATION_FLOOR = 0.06
const MAX_IDLE_ROTATION = 12
const MIN_SAMPLE_RATE = 40

function window(samples: ImuSample[], startedAt: number, startMs: number, endMs: number): ImuSample[] {
  return samples.filter((s) => s.t - startedAt >= startMs && s.t - startedAt < endMs)
}

export function computeBaseline(
  samples: ImuSample[],
  startedAt: number,
  audio: AudioLevels = { idleDb: null, revDb: null },
): Baseline {
  const idle = window(samples, startedAt, CALIBRATION_PHASES.idle.startMs, CALIBRATION_PHASES.idle.endMs)
  const rev = window(samples, startedAt, CALIBRATION_PHASES.rev.startMs, CALIBRATION_PHASES.rev.endMs)
  const gravity = meanVec(idle.map(accel))
  const gravityMagnitude = norm(gravity)
  const idleVibration = vibrationRms(idle.map(accel))
  const revVibration = vibrationRms(rev.map(accel))
  const idleRotation = mean(idle.map((s) => Math.sqrt(s.gx ** 2 + s.gy ** 2 + s.gz ** 2)))
  const span = samples.length > 1 ? (samples[samples.length - 1].t - samples[0].t) / 1000 : 0
  const sampleRateHz = span > 0 ? (samples.length - 1) / span : 0

  const warnings: string[] = []
  if (sampleRateHz < MIN_SAMPLE_RATE) warnings.push('感測器取樣率偏低，遊戲判定可能較不精準')
  if (Math.abs(gravityMagnitude - STANDARD_GRAVITY) > 0.8)
    warnings.push('重力讀數異常，請確認手機沒有被移動')
  const engineDetected = idleVibration >= ENGINE_VIBRATION_FLOOR
  if (!engineDetected) warnings.push('幾乎沒有偵測到引擎震動，請確認引擎已發動、手機固定在車上')
  const phoneStable = idleRotation <= MAX_IDLE_ROTATION
  if (!phoneStable) warnings.push('怠速時手機有晃動，請把手機固定好再校正')
  const revDetected = revVibration > idleVibration * 1.1
  if (!revDetected) warnings.push('沒有偵測到催油門時的震動變化')

  return {
    version: 1,
    gravity: gravity.map((v) => Number(v.toFixed(4))) as Vec3,
    gravityMagnitude: Number(gravityMagnitude.toFixed(4)),
    idleVibration: Number(idleVibration.toFixed(4)),
    revVibration: Number(revVibration.toFixed(4)),
    idleRotation: Number(idleRotation.toFixed(3)),
    sampleRateHz: Number(sampleRateHz.toFixed(1)),
    idleSampleCount: idle.length,
    revSampleCount: rev.length,
    audio,
    quality: { engineDetected, phoneStable, revDetected, warnings },
  }
}

/** A calibration the game can use: the phone was fixed and an engine was
 *  actually running. A missing rev change is only a warning. */
export function isBaselineUsable(baseline: Baseline): boolean {
  return (
    baseline.quality.engineDetected &&
    baseline.quality.phoneStable &&
    baseline.idleSampleCount >= 100
  )
}

/** RMS level (dBFS) of PCM samples in [-1, 1] within [startS, endS). */
export function rmsDb(pcm: Float32Array, sampleRate: number, startS: number, endS: number): number | null {
  const from = Math.max(0, Math.floor(startS * sampleRate))
  const to = Math.min(pcm.length, Math.floor(endS * sampleRate))
  if (to - from < sampleRate * 0.5) return null
  let sum = 0
  for (let i = from; i < to; i++) sum += pcm[i] * pcm[i]
  const rms = Math.sqrt(sum / (to - from))
  return rms > 0 ? Number((20 * Math.log10(rms)).toFixed(1)) : -120
}
