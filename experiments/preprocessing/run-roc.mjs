/**
 * EXP-A10 — fair comparison at a MATCHED false-alarm rate.
 *
 * Comparing detectors at one fixed z-threshold is misleading: a more sensitive
 * configuration buys recall with false alarms. Here each configuration gets its
 * own threshold swept, and configurations are compared at the same budget of
 * false alarms per minute on clean (tap-free) idle audio.
 */
import { writeFileSync } from 'node:fs'
import {
  decode, removeDcOffset, onePoleHighPass, peakNormalize, bandPass, rms,
  sliceWindows, powerSpectrum, nextPow2, median,
} from './lib-dsp.mjs'

const FILES = { A: 'D:/Downloads/1789735537560-ENG-03.aac', B: 'D:/Downloads/1789277691470-ENG-03.aac' }
const FS = 22050
const IDLE = [5.0, 14.0]
const TAP_COUNT = 12
const SEVERITIES = [1.0, 2.0]  // tap peak as a multiple of local background RMS
// Budget expressed per SESSION (one 9s idle phase), not per minute: a real
// inspection is a single 23s recording, and 9s of clean audio cannot resolve a
// "per minute" rate at all.
const FP_BUDGETS = [0, 1, 2, 4]

function makeTap(fs, { durationMs = 8, modesHz = [3200, 4700, 6300], decay = 450 } = {}) {
  const n = Math.round((durationMs / 1000) * fs)
  const x = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / fs
    let v = 0
    for (const f of modesHz) v += Math.sin(2 * Math.PI * f * t)
    x[i] = (v / modesHz.length) * Math.exp(-decay * t)
  }
  let pk = 0
  for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(x[i]))
  for (let i = 0; i < n; i++) x[i] /= pk || 1
  return x
}

function injectTaps(signal, fs, { count, severity, seed = 7 }) {
  const out = Float32Array.from(signal)
  const tap = makeTap(fs)
  const times = []
  const span = signal.length / fs
  let s = seed
  const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648 }
  for (let k = 0; k < count; k++) {
    const t = Math.min(span - 0.1, Math.max(0.1, ((k + 0.5) / count) * span + (rnd() - 0.5) * 0.25))
    const at = Math.floor(t * fs)
    const amp = severity * rms(signal.subarray(Math.max(0, at - fs / 4), Math.min(signal.length, at + fs / 4)))
    for (let i = 0; i < tap.length && at + i < out.length; i++) out[at + i] += tap[i] * amp
    times.push(t)
  }
  return { signal: out, tapTimesSec: times }
}

function fluxSeries(signal, fs, cfg) {
  const sig = cfg.bandHz ? bandPass(signal, fs, cfg.bandHz[0], cfg.bandHz[1], 2) : signal
  const norm = peakNormalize(sig)
  const wins = sliceWindows(norm, fs, cfg.windowMs, cfg.hopMs)
  const series = []
  let prev = null
  for (const w of wins) {
    const nfft = nextPow2(w.samples.length)
    const p = powerSpectrum(w.samples, nfft)
    const binHz = fs / nfft
    const lo = cfg.bandHz ? Math.floor(cfg.bandHz[0] / binHz) : 0
    const hi = Math.min(p.length, cfg.spectrumCeilingHz
      ? Math.ceil(cfg.spectrumCeilingHz / binHz)
      : (cfg.bandHz ? Math.ceil(cfg.bandHz[1] / binHz) : p.length))
    const cur = p.subarray(lo, hi)
    let flux = 0
    if (prev && prev.length === cur.length) {
      for (let b = 0; b < cur.length; b++) { const d = cur[b] - prev[b]; if (d > 0) flux += d }
    }
    prev = Float64Array.from(cur)
    series.push({ startMs: w.startMs, endMs: w.endMs, flux })
  }
  return series
}

function zSeries(series) {
  const vals = series.slice(1).map((s) => s.flux)
  const med = median(vals)
  const mad = median(vals.map((v) => Math.abs(v - med))) || 1e-15
  return series.slice(1).map((s) => ({ ...s, z: (s.flux - med) / (1.4826 * mad) }))
}

function recallAt(zs, threshold, tapTimesSec, hopMs) {
  const matched = new Set()
  for (const d of zs.filter((s) => s.z > threshold)) {
    const lo = (d.startMs - hopMs) / 1000
    const hi = (d.endMs + hopMs) / 1000
    const hit = tapTimesSec.findIndex((t, i) => !matched.has(i) && t >= lo && t <= hi)
    if (hit >= 0) matched.add(hit)
  }
  return (matched.size / tapTimesSec.length) * 100
}

const CONFIGS = [
  { id: 'prod', label: '現行：0–5 kHz、250/125 ms', windowMs: 250, hopMs: 125, bandHz: null, spectrumCeilingHz: 5000 },
  { id: 'prod_short', label: '0–5 kHz、46/23 ms', windowMs: 46, hopMs: 23, bandHz: null, spectrumCeilingHz: 5000 },
  { id: 'bp_short', label: '2–8 kHz 帶通、46/23 ms', windowMs: 46, hopMs: 23, bandHz: [2000, 8000], spectrumCeilingHz: null },
  { id: 'bp_vshort', label: '2–8 kHz 帶通、23/11 ms', windowMs: 23, hopMs: 11, bandHz: [2000, 8000], spectrumCeilingHz: null },
  { id: 'bp_knock', label: '6–8 kHz 帶通、23/11 ms', windowMs: 23, hopMs: 11, bandHz: [6000, 8000], spectrumCeilingHz: null },
]

const results = { generatedAt: new Date().toISOString(), severities: SEVERITIES, tapCount: TAP_COUNT,
  fpBudgetsPerSession: FP_BUDGETS, byRecording: {} }

for (const [key, path] of Object.entries(FILES)) {
  const { samples } = await decode(path, FS)
  const raw = onePoleHighPass(removeDcOffset(samples), FS, 20)
  const idle = raw.subarray(Math.floor(IDLE[0] * FS), Math.floor(IDLE[1] * FS))
  const idleSeconds = idle.length / FS

  console.log(`\n=== Recording ${key} (idle ${IDLE[0]}–${IDLE[1]}s = ${idleSeconds.toFixed(1)}s)`)
  const perConfig = {}

  for (const cfg of CONFIGS) {
    const zClean = zSeries(fluxSeries(idle, FS, cfg))
    const row = { label: cfg.label, windowMs: cfg.windowMs, hopMs: cfg.hopMs,
      band: cfg.bandHz ? `${cfg.bandHz[0]}-${cfg.bandHz[1]}Hz` : `0-${cfg.spectrumCeilingHz}Hz`,
      bySeverity: {} }

    for (const severity of SEVERITIES) {
      const { signal: tapped, tapTimesSec } = injectTaps(idle, FS, { count: TAP_COUNT, severity })
      const zTapped = zSeries(fluxSeries(tapped, FS, cfg))
      const curve = []
      for (let t = 1.5; t <= 40; t += 0.25) {
        curve.push({
          z: +t.toFixed(2),
          falseAlarmsPerSession: zClean.filter((s) => s.z > t).length,
          recallPct: +recallAt(zTapped, t, tapTimesSec, cfg.hopMs).toFixed(1),
        })
      }
      const atBudget = {}
      for (const budget of FP_BUDGETS) {
        const ok = curve.filter((p) => p.falseAlarmsPerSession <= budget)
        // best achievable recall while staying inside the budget
        const best = ok.reduce((b, p) => (!b || p.recallPct > b.recallPct ? p : b), null)
        atBudget[budget] = best
          ? { z: best.z, recallPct: best.recallPct, falseAlarms: best.falseAlarmsPerSession }
          : { z: null, recallPct: 0, falseAlarms: null }
      }
      row.bySeverity[severity] = { atBudget, curve }
    }
    perConfig[cfg.id] = row
  }

  for (const severity of SEVERITIES) {
    console.log(`  taps at ${severity}x background RMS — best recall within a per-session false-alarm budget:`)
    console.log(`    config                         ` + FP_BUDGETS.map((b) => `FA<=${b}`.padStart(9)).join(''))
    for (const cfg of CONFIGS) {
      const ab = perConfig[cfg.id].bySeverity[severity].atBudget
      console.log(`    ${cfg.label.padEnd(29)}` + FP_BUDGETS.map((b) => `${ab[b].recallPct}%`.padStart(9)).join(''))
    }
  }
  results.byRecording[key] = { file: path.split('/').pop(), idleSeconds: +idleSeconds.toFixed(1), configs: perConfig }
}

writeFileSync('roc-results.json', JSON.stringify(results, null, 2))
console.log('\nWrote roc-results.json')
