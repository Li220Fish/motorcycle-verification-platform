/** One accelerometer (+gravity, m/s²) and rotation-rate (deg/s) reading —
 *  the same shape the RiDE engine session records. `t` is epoch ms. */
export interface ImuSample {
  t: number
  x: number
  y: number
  z: number
  gx: number
  gy: number
  gz: number
}

export type Vec3 = [number, number, number]

export const STANDARD_GRAVITY = 9.80665

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

export function scale(a: Vec3, k: number): Vec3 {
  return [a[0] * k, a[1] * k, a[2] * k]
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

export function norm(a: Vec3): number {
  return Math.sqrt(dot(a, a))
}

export function accel(sample: ImuSample): Vec3 {
  return [sample.x, sample.y, sample.z]
}

export function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length
}

export function meanVec(vectors: Vec3[]): Vec3 {
  if (vectors.length === 0) return [0, 0, 0]
  const total = vectors.reduce<Vec3>((sum, v) => add(sum, v), [0, 0, 0])
  return scale(total, 1 / vectors.length)
}

/** RMS of each vector's distance from the set's own mean — the vibration
 *  level with gravity (a constant offset) removed. */
export function vibrationRms(vectors: Vec3[]): number {
  if (vectors.length === 0) return 0
  const center = meanVec(vectors)
  return Math.sqrt(mean(vectors.map((v) => dot(sub(v, center), sub(v, center)))))
}

/** Exponential-moving-average weight for a sample `dt` seconds after the
 *  previous one, for a low-pass time constant `tau` seconds. */
export function emaAlpha(dt: number, tau: number): number {
  return 1 - Math.exp(-dt / tau)
}
