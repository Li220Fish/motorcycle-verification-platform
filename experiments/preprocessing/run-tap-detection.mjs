/**
 * EXP-A9 — can the pipeline actually SEE a mechanical tapping event?
 *
 * Ground truth by construction: synthetic metallic taps are inserted into the
 * real idle-phase audio at known times and known severities, then each
 * candidate configuration is scored on recall / false positives. The taps are
 * synthetic (we have no labelled faulty-engine recordings), so this measures
 * DETECTABILITY of a known transient, not diagnostic accuracy on real faults.
 */
import { writeFileSync } from 'node:fs'
import {
  decode, removeDcOffset, onePoleHighPass, peakNormalize, bandPass, rms,
  sliceWindows, powerSpectrum, nextPow2, median, percentile, mean,
} from './lib-dsp.mjs'

const FILES = {
  A: 'D:/Downloads/1789735537560-ENG-03.aac',
  B: 'D:/Downloads/1789277691470-ENG-03.aac',
}
const FS = 22050
const IDLE = [5.0, 14.0]          // system-truth idle phase, seconds
const TAP_COUNT = 12
const SEVERITIES = [0.5, 1.0, 2.0] // tap peak as a multiple of local background RMS
const Z_THRESHOLD = 3              // MAD-based robust z, same rule in every config

/** A short metallic tap: resonant modes in the 3–7 kHz region with a fast
 *  exponential decay — the shape valvetrain/timing-chain tapping takes in the
 *  acoustic literature the project's own spec cites. */
function makeTap(fs, { durationMs = 8, modesHz = [3200, 4700, 6300], decay = 450 } = {}) {
  const n = Math.round((durationMs / 1000) * fs)
  const x = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / fs
    const env = Math.exp(-decay * t)
    let v = 0
    for (const f of modesHz) v += Math.sin(2 * Math.PI * f * t)
    x[i] = (v / modesHz.length) * env
  }
  let pk = 0
  for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(x[i]))
  for (let i = 0; i < n; i++) x[i] /= pk || 1
  return x
}

function injectTaps(signal, fs, { count, severity, seed = 1 }) {
  const out = Float32Array.from(signal)
  const tap = makeTap(fs)
  const times = []
  const span = signal.length / fs
  // deterministic pseudo-random jitter so results are reproducible
  let s = seed
  const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648 }
  for (let k = 0; k < count; k++) {
    const base = ((k + 0.5) / count) * span
    const t = Math.min(span - 0.1, Math.max(0.1, base + (rnd() - 0.5) * 0.25))
    const at = Math.floor(t * fs)
    const localRms = rms(signal.subarray(Math.max(0, at - fs / 4), Math.min(signal.length, at + fs / 4)))
    const amp = severity * localRms
    for (let i = 0; i < tap.length && at + i < out.length; i++) out[at + i] += tap[i] * amp
    times.push(t)
  }
  return { signal: out, tapTimesSec: times }
}

/** Spectral-flux detection function for one configuration. */
function fluxSeries(signal, fs, { windowMs, hopMs, bandHz, spectrumCeilingHz }) {
  const sig = bandHz ? bandPass(signal, fs, bandHz[0], bandHz[1], 2) : signal
  const norm = peakNormalize(sig)
  const wins = sliceWindows(norm, fs, windowMs, hopMs)
  const series = []
  let prev = null
  for (const w of wins) {
    const nfft = nextPow2(w.samples.length)
    const p = powerSpectrum(w.samples, nfft)
    const binHz = fs / nfft
    const lo = bandHz ? Math.floor(bandHz[0] / binHz) : 0
    const hi = Math.min(p.length, spectrumCeilingHz
      ? Math.ceil(spectrumCeilingHz / binHz)
      : (bandHz ? Math.ceil(bandHz[1] / binHz) : p.length))
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

function detect(series, { windowMs, hopMs }) {
  const vals = series.slice(1).map((s) => s.flux)
  if (vals.length < 5) return []
  const med = median(vals)
  const mad = median(vals.map((v) => Math.abs(v - med))) || 1e-15
  return series.slice(1)
    .map((s) => ({ ...s, z: (s.flux - med) / (1.4826 * mad) }))
    .filter((s) => s.z > Z_THRESHOLD)
}

/** A detection covers a tap if the tap time falls inside the window it spans
 *  (plus one hop of slack) — fair to long and short windows alike. */
function score(detections, tapTimesSec, { hopMs }) {
  const matchedTaps = new Set()
  let truePositives = 0
  let falsePositives = 0
  for (const d of detections) {
    const lo = (d.startMs - hopMs) / 1000
    const hi = (d.endMs + hopMs) / 1000
    const hit = tapTimesSec.findIndex((t, i) => !matchedTaps.has(i) && t >= lo && t <= hi)
    if (hit >= 0) { matchedTaps.add(hit); truePositives++ } else { falsePositives++ }
  }
  return {
    detected: matchedTaps.size,
    totalTaps: tapTimesSec.length,
    recallPct: +((matchedTaps.size / tapTimesSec.length) * 100).toFixed(1),
    falsePositives,
    truePositives,
  }
}

const CONFIGS = [
  { id: 'prod', label: '現行設定：0–5 kHz 頻譜上限、250/125 ms 視窗',
    windowMs: 250, hopMs: 125, bandHz: null, spectrumCeilingHz: 5000 },
  { id: 'prod_short', label: '只縮短視窗：0–5 kHz、46/23 ms',
    windowMs: 46, hopMs: 23, bandHz: null, spectrumCeilingHz: 5000 },
  { id: 'bp_long', label: '只加帶通：2–8 kHz、250/125 ms',
    windowMs: 250, hopMs: 125, bandHz: [2000, 8000], spectrumCeilingHz: null },
  { id: 'bp_short', label: '帶通＋短視窗：2–8 kHz、46/23 ms',
    windowMs: 46, hopMs: 23, bandHz: [2000, 8000], spectrumCeilingHz: null },
  { id: 'bp_vshort', label: '帶通＋極短視窗：2–8 kHz、23/11 ms',
    windowMs: 23, hopMs: 11, bandHz: [2000, 8000], spectrumCeilingHz: null },
  { id: 'bp_knock', label: '爆震帶：6–8 kHz、23/11 ms',
    windowMs: 23, hopMs: 11, bandHz: [6000, 8000], spectrumCeilingHz: null },
]

const results = { generatedAt: new Date().toISOString(), zThreshold: Z_THRESHOLD,
  tapCount: TAP_COUNT, severities: SEVERITIES, byRecording: {} }

for (const [key, path] of Object.entries(FILES)) {
  const { samples } = await decode(path, FS)
  const raw = onePoleHighPass(removeDcOffset(samples), FS, 20)
  const idle = raw.subarray(Math.floor(IDLE[0] * FS), Math.floor(IDLE[1] * FS))
  console.log(`\n=== Recording ${key} — idle phase ${IDLE[0]}–${IDLE[1]}s, background rms ${rms(idle).toFixed(4)}`)

  const perConfig = {}
  for (const cfg of CONFIGS) {
    // false positives on the CLEAN idle (no taps) — the honest baseline
    const cleanDet = detect(fluxSeries(idle, FS, cfg), cfg)
    const cleanFpPerMin = +((cleanDet.length / ((idle.length / FS) / 60))).toFixed(1)

    const bySeverity = {}
    for (const sev of SEVERITIES) {
      const { signal, tapTimesSec } = injectTaps(idle, FS, { count: TAP_COUNT, severity: sev, seed: 7 })
      const det = detect(fluxSeries(signal, FS, cfg), cfg)
      bySeverity[sev] = score(det, tapTimesSec, cfg)
    }
    perConfig[cfg.id] = {
      label: cfg.label,
      windowMs: cfg.windowMs, hopMs: cfg.hopMs,
      band: cfg.bandHz ? `${cfg.bandHz[0]}-${cfg.bandHz[1]}Hz` : `0-${cfg.spectrumCeilingHz}Hz`,
      cleanFalsePositives: cleanDet.length,
      cleanFalsePositivesPerMin: cleanFpPerMin,
      bySeverity,
    }
    console.log(`  ${cfg.id.padEnd(10)} recall ` +
      SEVERITIES.map((s) => `${s}x:${String(bySeverity[s].recallPct).padStart(5)}%`).join('  ') +
      `   | clean-idle false alarms: ${cleanDet.length}`)
  }
  results.byRecording[key] = { file: path.split('/').pop(), idleBackgroundRms: +rms(idle).toFixed(4), configs: perConfig }
}

writeFileSync('tap-detection-results.json', JSON.stringify(results, null, 2))
console.log('\nWrote tap-detection-results.json')
