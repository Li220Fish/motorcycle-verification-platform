import type { Baseline } from './calibration'
import { accel, dot, emaAlpha, norm, scale, sub, type ImuSample, type Vec3 } from './imu'

/**
 * 豆腐損傷模型 — the tofu sits on the phone's mount; anything that would
 * slosh it hurts it:
 *
 *  sway  — sustained horizontal acceleration (hard braking, hard launch,
 *          sharp swerve). Low-passed (τ 0.25 s) so engine buzz and road
 *          texture don't count; the calibrated engine vibration floor is
 *          subtracted. Damage grows with the square of the excess.
 *  bump  — a sharp vertical jolt (pothole, kerb, speed hump taken fast).
 *
 * Damage only accrues while the bike is moving (GPS): picking the phone up
 * at a red light or after arriving never breaks the tofu. Speed itself is
 * never scored — riding smoothly is the whole game.
 */
export interface TofuTuning {
  swayThreshold: number
  swayFactor: number
  bumpThreshold: number
  bumpFactor: number
  bumpCooldownMs: number
}

export const DEFAULT_TUNING: TofuTuning = {
  swayThreshold: 2.2, // m/s² ≈ 0.22 g — normal, unhurried riding stays under this
  swayFactor: 4, // % per (m/s²)²·s
  bumpThreshold: 5.5, // m/s² vertical
  bumpFactor: 2, // % per m/s² over the threshold
  bumpCooldownMs: 500,
}

export type TofuEventType = 'sway' | 'bump' | 'warning' | 'broken'

export interface TofuEvent {
  type: TofuEventType
  t: number
  /** Peak excess acceleration (m/s²) for sway/bump. */
  peak?: number
  /** Integrity lost by this event (%). */
  damage?: number
  /** Integrity after the event. */
  integrity: number
}

const WARNING_LEVELS = [80, 50, 20]

export class TofuEngine {
  private gravity: Vec3
  private readonly noise: number
  private readonly tuning: TofuTuning
  private lastT: number | null = null
  private swayLp = 0
  private verticalLp = 0
  private damage = 0
  private swayEpisode: { start: number; peak: number; damage: number } | null = null
  private lastBumpAt = -Infinity
  private warned = new Set<number>()
  private brokenAnnounced = false

  constructor(baseline: Pick<Baseline, 'gravity' | 'idleVibration'>, tuning: TofuTuning = DEFAULT_TUNING) {
    this.gravity = [...baseline.gravity]
    this.noise = baseline.idleVibration
    this.tuning = tuning
  }

  get integrity(): number {
    return Math.max(0, Number((100 - this.damage).toFixed(1)))
  }

  /** Feed one IMU sample; `moving` comes from GPS. Returns any events. */
  push(sample: ImuSample, moving: boolean): TofuEvent[] {
    const events: TofuEvent[] = []
    const dt = this.lastT === null ? 0.01 : Math.min(0.1, Math.max(0, (sample.t - this.lastT) / 1000))
    this.lastT = sample.t
    if (dt === 0) return events

    const a = accel(sample)
    // Track slow mount/slope drift — but only from samples pointing almost
    // exactly along current gravity (< 4°). A 0.5 g brake only changes |a|
    // by ~1.2 m/s², so a magnitude test alone let braking leak into
    // "gravity" and silently forgave part of it.
    const cosToGravity = dot(a, this.gravity) / ((norm(a) || 1) * (norm(this.gravity) || 1))
    if (cosToGravity > 0.9976 && Math.abs(norm(a) - norm(this.gravity)) < 1) {
      const k = emaAlpha(dt, 20)
      this.gravity = [
        this.gravity[0] + (a[0] - this.gravity[0]) * k,
        this.gravity[1] + (a[1] - this.gravity[1]) * k,
        this.gravity[2] + (a[2] - this.gravity[2]) * k,
      ]
    }
    const gNorm = norm(this.gravity) || 1
    const up = scale(this.gravity, 1 / gNorm)
    const linear = sub(a, this.gravity)
    const vertical = dot(linear, up)
    const horizontal = norm(sub(linear, scale(up, vertical)))

    this.swayLp += (horizontal - this.swayLp) * emaAlpha(dt, 0.25)
    this.verticalLp += (vertical - this.verticalLp) * emaAlpha(dt, 0.04)

    const swayExcess = Math.max(0, this.swayLp - this.noise) - this.tuning.swayThreshold
    if (moving && swayExcess > 0) {
      const loss = this.tuning.swayFactor * swayExcess * swayExcess * dt
      this.damage += loss
      if (!this.swayEpisode) this.swayEpisode = { start: sample.t, peak: 0, damage: 0 }
      this.swayEpisode.peak = Math.max(this.swayEpisode.peak, swayExcess)
      this.swayEpisode.damage += loss
    } else if (this.swayEpisode) {
      events.push({
        type: 'sway',
        t: this.swayEpisode.start,
        peak: Number(this.swayEpisode.peak.toFixed(2)),
        damage: Number(this.swayEpisode.damage.toFixed(2)),
        integrity: this.integrity,
      })
      this.swayEpisode = null
    }

    const bumpExcess = Math.abs(this.verticalLp) - 2 * this.noise - this.tuning.bumpThreshold
    if (moving && bumpExcess > 0 && sample.t - this.lastBumpAt >= this.tuning.bumpCooldownMs) {
      const loss = Math.min(25, this.tuning.bumpFactor * bumpExcess)
      this.damage += loss
      this.lastBumpAt = sample.t
      events.push({
        type: 'bump',
        t: sample.t,
        peak: Number(bumpExcess.toFixed(2)),
        damage: Number(loss.toFixed(2)),
        integrity: this.integrity,
      })
    }

    for (const level of WARNING_LEVELS) {
      if (this.integrity <= level && this.integrity > 0 && !this.warned.has(level)) {
        this.warned.add(level)
        events.push({ type: 'warning', t: sample.t, integrity: level })
      }
    }
    if (this.integrity <= 0 && !this.brokenAnnounced) {
      this.brokenAnnounced = true
      events.push({ type: 'broken', t: sample.t, integrity: 0 })
    }
    return events
  }
}

export type Grade = 'S' | 'A' | 'B' | 'C' | 'D' | '失敗'

/** Shorter than this isn't a delivery. */
export const MIN_DELIVERY_METERS = 300

export function gradeFor(integrity: number, distanceMeters: number): Grade | null {
  if (distanceMeters < MIN_DELIVERY_METERS) return null
  if (integrity <= 0) return '失敗'
  if (integrity >= 95) return 'S'
  if (integrity >= 85) return 'A'
  if (integrity >= 70) return 'B'
  if (integrity >= 50) return 'C'
  return 'D'
}

export const VOICE_LINES: Record<'start' | 'broken' | 'arrive' | `warn${number}`, string> = {
  start: '豆腐上車了，出發。請專心騎車，平穩就是勝利。',
  warn80: '豆腐開始晃了，騎穩一點。',
  warn50: '豆腐只剩一半完整，放慢動作。',
  warn20: '豆腐快碎了，小心駕駛。',
  broken: '豆腐碎了。請找安全的地方停車，再結束這一趟。',
  arrive: '送達！停好車再看成績。',
}
