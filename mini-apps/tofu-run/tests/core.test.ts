import { describe, expect, it } from 'vitest'

import {
  CALIBRATION_DURATION_MS,
  computeBaseline,
  instructionAt,
  isBaselineUsable,
  rmsDb,
} from '../src/core/calibration'
import { haversineMeters, TripRecorder } from '../src/core/geo'
import type { ImuSample } from '../src/core/imu'
import { gradeFor, TofuEngine } from '../src/core/tofu-engine'

/** Phone lying screen-up (gravity on +z), 100 Hz, with engine-like buzz. */
function session(opts: { idleBuzz: number; revBuzz: number; rotation?: number; hz?: number }): ImuSample[] {
  const hz = opts.hz ?? 100
  const samples: ImuSample[] = []
  for (let i = 0; i < (CALIBRATION_DURATION_MS / 1000) * hz; i++) {
    const t = 1_000_000 + (i * 1000) / hz
    const buzz = (t - 1_000_000 < 9000 ? opts.idleBuzz : opts.revBuzz) * Math.sin(i * 2.1)
    samples.push({ t, x: buzz, y: buzz * 0.5, z: 9.81 + buzz, gx: opts.rotation ?? 1, gy: 0, gz: 0 })
  }
  return samples
}

describe('calibration', () => {
  it('a phone fixed on a running bike gives a usable baseline', () => {
    const b = computeBaseline(session({ idleBuzz: 0.4, revBuzz: 0.9 }), 1_000_000)
    expect(b.gravity[2]).toBeCloseTo(9.81, 1)
    expect(b.idleVibration).toBeGreaterThan(0.2)
    expect(b.revVibration).toBeGreaterThan(b.idleVibration)
    expect(b.sampleRateHz).toBeCloseTo(100, 0)
    expect(b.quality).toMatchObject({ engineDetected: true, phoneStable: true, revDetected: true })
    expect(isBaselineUsable(b)).toBe(true)
  })

  it('no engine vibration or a hand-held phone is rejected', () => {
    const desk = computeBaseline(session({ idleBuzz: 0.005, revBuzz: 0.005 }), 1_000_000)
    expect(desk.quality.engineDetected).toBe(false)
    expect(isBaselineUsable(desk)).toBe(false)
    const handheld = computeBaseline(session({ idleBuzz: 0.4, revBuzz: 0.9, rotation: 40 }), 1_000_000)
    expect(handheld.quality.phoneStable).toBe(false)
    expect(isBaselineUsable(handheld)).toBe(false)
  })

  it('instructions follow the hot-engine timeline', () => {
    expect(instructionAt(0)).toContain('怠速')
    expect(instructionAt(9.5)).toContain('油門')
  })

  it('audio level in dBFS', () => {
    const pcm = new Float32Array(48000).fill(0.5)
    expect(rmsDb(pcm, 16000, 0, 2)).toBeCloseTo(-6, 0)
    expect(rmsDb(pcm, 16000, 0, 0.1)).toBeNull()
  })
})

describe('tofu engine', () => {
  const baseline = { gravity: [0, 0, 9.81] as [number, number, number], idleVibration: 0.3 }
  const feed = (engine: TofuEngine, seconds: number, a: (t: number) => [number, number, number], moving = true, start = 0) => {
    const events = []
    for (let i = 0; i < seconds * 100; i++) {
      const t = start + i * 10
      const [x, y, z] = a(t)
      events.push(...engine.push({ t, x, y, z, gx: 0, gy: 0, gz: 0 }, moving))
    }
    return events
  }

  it('smooth riding with engine buzz keeps the tofu whole', () => {
    const engine = new TofuEngine(baseline)
    feed(engine, 60, (t) => [0.3 * Math.sin(t), 0.8 * Math.sin(t / 900), 9.81 + 0.3 * Math.cos(t)])
    expect(engine.integrity).toBe(100)
  })

  it('a hard 0.5 g brake is a sway event that costs a lot', () => {
    const engine = new TofuEngine(baseline)
    feed(engine, 2, () => [0, 0, 9.81])
    const events = feed(engine, 1.5, () => [0, 5, 9.81], true, 2000)
    events.push(...feed(engine, 1, () => [0, 0, 9.81], true, 3500))
    const sway = events.find((e) => e.type === 'sway')
    expect(sway).toBeTruthy()
    expect(engine.integrity).toBeLessThan(80)
    expect(events.some((e) => e.type === 'warning' && e.integrity === 80)).toBe(true)
  })

  it('a pothole is a bump; nothing counts while stopped', () => {
    const engine = new TofuEngine(baseline)
    feed(engine, 1, () => [0, 0, 9.81])
    const bump = feed(engine, 0.2, (t) => [0, 0, t < 1100 ? 9.81 + 14 : 9.81], true, 1000)
    expect(bump.filter((e) => e.type === 'bump')).toHaveLength(1)
    const parked = new TofuEngine(baseline)
    feed(parked, 3, () => [0, 6, 9.81 + 14], false)
    expect(parked.integrity).toBe(100)
  })

  it('breaking the tofu is announced once', () => {
    const engine = new TofuEngine(baseline)
    const events = feed(engine, 20, () => [0, 9, 9.81])
    expect(engine.integrity).toBe(0)
    expect(events.filter((e) => e.type === 'broken')).toHaveLength(1)
  })

  it('grades', () => {
    expect(gradeFor(100, 100)).toBeNull()
    expect(gradeFor(97, 1000)).toBe('S')
    expect(gradeFor(86, 1000)).toBe('A')
    expect(gradeFor(60, 1000)).toBe('C')
    expect(gradeFor(0, 1000)).toBe('失敗')
  })
})

describe('trip recorder', () => {
  it('measures distance, rejects inaccurate fixes and GPS jumps', () => {
    const trip = new TripRecorder()
    const base = { lat: 22.9971, lng: 120.2127 }
    // ~11 m per 0.0001° lat, one fix per second at ~11 m/s
    for (let i = 0; i <= 10; i++) trip.add({ t: i * 1000, lat: base.lat + i * 0.0001, lng: base.lng, accuracy: 5, speed: 11 })
    trip.add({ t: 11000, lat: base.lat + 0.01, lng: base.lng, accuracy: 5, speed: 11 }) // 1 km jump in 1 s
    trip.add({ t: 12000, lat: base.lat + 0.0015, lng: base.lng, accuracy: 80, speed: 11 }) // inaccurate
    expect(trip.distanceMeters).toBeGreaterThan(100)
    expect(trip.distanceMeters).toBeLessThan(120)
    expect(trip.isMoving(12000)).toBe(true)
    expect(trip.isMoving(20000)).toBe(false)
    expect(haversineMeters(base, { lat: base.lat + 0.001, lng: base.lng })).toBeCloseTo(111, 0)
  })
})
