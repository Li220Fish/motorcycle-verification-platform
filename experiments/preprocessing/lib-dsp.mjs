// Shared DSP helpers for the MotoVerify preprocessing experiments.
// Deliberately standalone (no imports from functions/src) so the experiment
// can reimplement the production baseline exactly and vary one thing at a time.

import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

// sharp / ffmpeg come from the Cloud Functions workspace, resolved relative to
// this file so the experiment runs on any checkout, not just one machine.
const require = createRequire(new URL('../../functions/package.json', import.meta.url))
export const FFMPEG = require('@ffmpeg-installer/ffmpeg').path

/** Decode any audio file to mono float32 [-1,1] at the requested rate. */
export function decode(path, sampleRateHz) {
  return new Promise((resolve, reject) => {
    const args = ['-v', 'error', '-i', path, '-f', 's16le', '-acodec', 'pcm_s16le',
      '-ac', '1', '-ar', String(sampleRateHz), 'pipe:1']
    const proc = spawn(FFMPEG, args)
    const chunks = []
    proc.stdout.on('data', (c) => chunks.push(c))
    proc.stderr.on('data', () => {})
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(`ffmpeg exited ${code}`))
      const buf = Buffer.concat(chunks)
      const n = Math.floor(buf.length / 2)
      const out = new Float32Array(n)
      for (let i = 0; i < n; i++) out[i] = buf.readInt16LE(i * 2) / 32768
      resolve({ samples: out, sampleRateHz })
    })
  })
}

// ---------- production baseline preprocessing (mirrors audio-preprocessor.ts) ----------

export function removeDcOffset(x) {
  let mean = 0
  for (let i = 0; i < x.length; i++) mean += x[i]
  mean /= x.length || 1
  const y = new Float32Array(x.length)
  for (let i = 0; i < x.length; i++) y[i] = x[i] - mean
  return y
}

/** One-pole IIR high-pass — identical formula to production. */
export function onePoleHighPass(x, fs, cutoffHz) {
  const rc = 1 / (2 * Math.PI * cutoffHz)
  const dt = 1 / fs
  const alpha = rc / (rc + dt)
  const y = new Float32Array(x.length)
  let prevIn = x[0] ?? 0
  let prevOut = 0
  for (let i = 0; i < x.length; i++) {
    const out = alpha * (prevOut + x[i] - prevIn)
    y[i] = out
    prevIn = x[i]
    prevOut = out
  }
  return y
}

/** 2nd-order Butterworth high-pass (RBJ biquad), optionally cascaded. */
export function biquadHighPass(x, fs, cutoffHz, stages = 1) {
  let sig = x
  for (let s = 0; s < stages; s++) {
    const w0 = (2 * Math.PI * cutoffHz) / fs
    const cosw = Math.cos(w0)
    const sinw = Math.sin(w0)
    const q = Math.SQRT1_2
    const alpha = sinw / (2 * q)
    const b0 = (1 + cosw) / 2
    const b1 = -(1 + cosw)
    const b2 = (1 + cosw) / 2
    const a0 = 1 + alpha
    const a1 = -2 * cosw
    const a2 = 1 - alpha
    const y = new Float32Array(sig.length)
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0
    for (let i = 0; i < sig.length; i++) {
      const xi = sig[i]
      const yi = (b0 / a0) * xi + (b1 / a0) * x1 + (b2 / a0) * x2 - (a1 / a0) * y1 - (a2 / a0) * y2
      y[i] = yi
      x2 = x1; x1 = xi; y2 = y1; y1 = yi
    }
    sig = y
  }
  return sig
}

export function peakNormalize(x) {
  let peak = 0
  for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > peak) peak = a }
  if (peak === 0) return new Float32Array(x.length)
  const y = new Float32Array(x.length)
  const s = 1 / peak
  for (let i = 0; i < x.length; i++) y[i] = x[i] * s
  return y
}

/** RMS normalization to a target RMS level (default -20 dBFS). */
export function rmsNormalize(x, targetRms = 0.1) {
  const r = rms(x)
  if (r === 0) return new Float32Array(x.length)
  const y = new Float32Array(x.length)
  const s = targetRms / r
  for (let i = 0; i < x.length; i++) y[i] = Math.max(-1, Math.min(1, x[i] * s))
  return y
}

// ---------- basic stats ----------

export function rms(x) {
  if (!x.length) return 0
  let sum = 0
  for (let i = 0; i < x.length; i++) sum += x[i] * x[i]
  return Math.sqrt(sum / x.length)
}
export function peakAmplitude(x) {
  let p = 0
  for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > p) p = a }
  return p
}
export const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0)
export function stdev(a) {
  if (a.length < 2) return 0
  const m = mean(a)
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length)
}
export const cv = (a) => { const m = mean(a); return m > 0 ? stdev(a) / m : 0 }
export function percentile(a, p) {
  if (!a.length) return 0
  const s = [...a].sort((x, y) => x - y)
  const idx = Math.min(s.length - 1, Math.max(0, Math.round((p / 100) * (s.length - 1))))
  return s[idx]
}
export function median(a) { return percentile(a, 50) }

/** Cohen's d — standardized separation between two sample sets. */
export function cohensD(a, b) {
  if (a.length < 2 || b.length < 2) return 0
  const ma = mean(a), mb = mean(b)
  const va = a.reduce((s, v) => s + (v - ma) ** 2, 0) / (a.length - 1)
  const vb = b.reduce((s, v) => s + (v - mb) ** 2, 0) / (b.length - 1)
  const pooled = Math.sqrt(((a.length - 1) * va + (b.length - 1) * vb) / (a.length + b.length - 2))
  return pooled > 0 ? Math.abs(ma - mb) / pooled : 0
}

// ---------- FFT ----------

export function nextPow2(n) { let p = 1; while (p < n) p <<= 1; return p }

/** In-place iterative radix-2 Cooley-Tukey FFT. re/im are Float64Array. */
export function fft(re, im) {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t
      t = im[i]; im[i] = im[j]; im[j] = t
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    const wr = Math.cos(ang), wi = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let cwr = 1, cwi = 0
      for (let j = 0; j < len / 2; j++) {
        const ur = re[i + j], ui = im[i + j]
        const vr = re[i + j + len / 2] * cwr - im[i + j + len / 2] * cwi
        const vi = re[i + j + len / 2] * cwi + im[i + j + len / 2] * cwr
        re[i + j] = ur + vr; im[i + j] = ui + vi
        re[i + j + len / 2] = ur - vr; im[i + j + len / 2] = ui - vi
        const nwr = cwr * wr - cwi * wi
        cwi = cwr * wi + cwi * wr
        cwr = nwr
      }
    }
  }
}

export function ifft(re, im) {
  const n = re.length
  for (let i = 0; i < n; i++) im[i] = -im[i]
  fft(re, im)
  for (let i = 0; i < n; i++) { re[i] /= n; im[i] = -im[i] / n }
}

export function hann(n) {
  const w = new Float64Array(n)
  if (n <= 1) { w[0] = 1; return w }
  for (let i = 0; i < n; i++) w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)))
  return w
}

/** Power spectrum (length nfft/2+1) of one frame, Hann-windowed. */
export function powerSpectrum(frame, nfft) {
  const re = new Float64Array(nfft)
  const im = new Float64Array(nfft)
  const w = hann(frame.length)
  for (let i = 0; i < frame.length; i++) re[i] = frame[i] * w[i]
  fft(re, im)
  const half = nfft / 2 + 1
  const p = new Float64Array(half)
  for (let i = 0; i < half; i++) p[i] = (re[i] * re[i] + im[i] * im[i]) / nfft
  return p
}

/** STFT magnitude+phase frames. */
export function stft(x, nfft, hop) {
  const w = hann(nfft)
  const frames = []
  for (let start = 0; start + nfft <= x.length; start += hop) {
    const re = new Float64Array(nfft)
    const im = new Float64Array(nfft)
    for (let i = 0; i < nfft; i++) re[i] = x[start + i] * w[i]
    fft(re, im)
    frames.push({ start, re, im })
  }
  return frames
}

/** Overlap-add resynthesis from modified STFT frames (Hann, 75% overlap). */
export function istft(frames, nfft, hop, length) {
  const out = new Float64Array(length)
  const norm = new Float64Array(length)
  const w = hann(nfft)
  for (const f of frames) {
    const re = Float64Array.from(f.re)
    const im = Float64Array.from(f.im)
    ifft(re, im)
    for (let i = 0; i < nfft; i++) {
      const idx = f.start + i
      if (idx >= length) break
      out[idx] += re[i] * w[i]
      norm[idx] += w[i] * w[i]
    }
  }
  const y = new Float32Array(length)
  for (let i = 0; i < length; i++) y[i] = norm[i] > 1e-8 ? out[i] / norm[i] : 0
  return y
}

// ---------- noise reduction ----------

/**
 * Spectral-subtraction denoiser.
 *
 * Two ways to build the noise profile, and the difference matters a lot here:
 *
 * - `noiseRangeSec: [a, b]` — average the spectrum over a stretch of the
 *   recording known to contain no engine sound. This is the correct mode for
 *   engine audio.
 * - percentile mode (default, when no range is given) — the textbook
 *   "minimum statistics" estimator that takes a low percentile per bin over
 *   time. It assumes the SIGNAL is non-stationary and the NOISE is stationary.
 *   A running engine at idle breaks that assumption: its harmonics are
 *   stationary too, so this estimator classifies the engine itself as noise
 *   and subtracts it away. Kept here only so the experiment can measure that
 *   failure rather than assert it.
 */
export function spectralGate(x, fs, { nfft = 1024, hop = 256, noisePercentile = 15,
  oversubtraction = 1.5, floorGain = 0.1, noiseRangeSec = null } = {}) {
  const frames = stft(x, nfft, hop)
  if (!frames.length) return { signal: x, noiseProfile: null }
  const half = nfft / 2 + 1
  const mags = frames.map((f) => {
    const m = new Float64Array(half)
    for (let i = 0; i < half; i++) m[i] = Math.hypot(f.re[i], f.im[i])
    return m
  })
  const noise = new Float64Array(half)
  if (noiseRangeSec) {
    const [a, b] = noiseRangeSec
    const sel = frames
      .map((f, i) => ({ sec: f.start / fs, i }))
      .filter(({ sec }) => sec >= a && sec < b)
      .map(({ i }) => mags[i])
    if (!sel.length) throw new Error('noiseRangeSec selected no frames')
    for (let bin = 0; bin < half; bin++) {
      noise[bin] = mean(sel.map((m) => m[bin]))
    }
  } else {
    for (let b = 0; b < half; b++) {
      noise[b] = percentile(mags.map((m) => m[b]), noisePercentile)
    }
  }
  const outFrames = frames.map((f, fi) => {
    const re = new Float64Array(nfft)
    const im = new Float64Array(nfft)
    for (let b = 0; b < half; b++) {
      const mag = mags[fi][b]
      const target = Math.max(mag - oversubtraction * noise[b], floorGain * mag)
      const gain = mag > 1e-12 ? target / mag : 0
      re[b] = f.re[b] * gain
      im[b] = f.im[b] * gain
      if (b > 0 && b < nfft / 2) { re[nfft - b] = re[b]; im[nfft - b] = -im[b] }
    }
    return { start: f.start, re, im }
  })
  return { signal: istft(outFrames, nfft, hop, x.length), noiseProfile: noise }
}

/**
 * Harmonic-to-floor ratio (dB): per frame, the broadband noise floor is taken
 * as a low percentile of power ACROSS FREQUENCY, and everything standing above
 * that floor counts as structured (harmonic/transient) content.
 *
 * Deliberately not a minimum-statistics SNR over time: engine sound is itself
 * quasi-stationary, so a time-percentile floor estimator classifies the engine
 * harmonics themselves as "noise" (verified — that is exactly how the first
 * version of this function failed its own sanity check). Measuring the floor
 * across frequency instead matches what the pipeline actually needs to know:
 * how far the engine's structured content stands above broadband wind/traffic
 * noise. Gain-independent, since it is a ratio within each frame.
 */
export function harmonicToFloorDb(x, fs, { nfft = 2048, hop = 1024, floorPercentile = 25 } = {}) {
  const frames = stft(x, nfft, hop)
  if (!frames.length) return null
  const half = nfft / 2 + 1
  const perFrame = []
  for (const f of frames) {
    const p = new Float64Array(half)
    for (let i = 0; i < half; i++) p[i] = (f.re[i] ** 2 + f.im[i] ** 2) / nfft
    const floor = percentile(Array.from(p), floorPercentile)
    if (floor <= 0) continue
    let above = 0
    for (let i = 0; i < half; i++) above += Math.max(0, p[i] - floor)
    const noiseTotal = floor * half
    perFrame.push(10 * Math.log10(Math.max(above, 1e-20) / Math.max(noiseTotal, 1e-20)))
  }
  return perFrame.length ? mean(perFrame) : null
}

// ---------- band analysis ----------

/** Energy fraction per frequency band over the whole signal. */
export function bandEnergyProfile(x, fs, bands, { nfft = 4096, hop = 2048 } = {}) {
  const frames = stft(x, nfft, hop)
  const half = nfft / 2 + 1
  const acc = new Float64Array(half)
  for (const f of frames) {
    for (let b = 0; b < half; b++) acc[b] += (f.re[b] ** 2 + f.im[b] ** 2) / nfft
  }
  let total = 0
  for (let b = 0; b < half; b++) total += acc[b]
  const binHz = fs / nfft
  const out = {}
  for (const [name, [lo, hi]] of Object.entries(bands)) {
    let sum = 0
    for (let b = 0; b < half; b++) {
      const hz = b * binHz
      if (hz >= lo && hz < hi) sum += acc[b]
    }
    out[name] = total > 0 ? sum / total : 0
  }
  out.__totalPower = total
  return out
}

// ---------- window features ----------

export function sliceWindows(x, fs, windowMs, hopMs) {
  const win = Math.max(1, Math.round((windowMs / 1000) * fs))
  const hop = Math.max(1, Math.round((hopMs / 1000) * fs))
  const out = []
  for (let start = 0; start + win <= x.length; start += hop) {
    out.push({
      startMs: (start / fs) * 1000,
      endMs: ((start + win) / fs) * 1000,
      samples: x.subarray(start, start + win),
    })
  }
  return out
}

export function zeroCrossingRate(x) {
  if (x.length < 2) return 0
  let c = 0
  for (let i = 1; i < x.length; i++) {
    if ((x[i - 1] >= 0 && x[i] < 0) || (x[i - 1] < 0 && x[i] >= 0)) c++
  }
  return c / (x.length - 1)
}

export function spectralCentroid(power, fs, nfft) {
  const binHz = fs / nfft
  let num = 0, den = 0
  for (let b = 0; b < power.length; b++) { num += b * binHz * power[b]; den += power[b] }
  return den > 0 ? num / den : 0
}
export function spectralFlatness(power) {
  const ps = Array.from(power).filter((p) => p > 0)
  if (!ps.length) return 0
  const gm = Math.exp(ps.reduce((s, p) => s + Math.log(p), 0) / ps.length)
  const am = ps.reduce((s, p) => s + p, 0) / ps.length
  return am > 0 ? gm / am : 0
}
export function spectralEntropy(power) {
  let total = 0
  for (const p of power) total += p
  if (total <= 0) return 0
  let h = 0
  for (const p of power) { if (p > 0) { const q = p / total; h -= q * Math.log2(q) } }
  return h / Math.log2(power.length)
}

/**
 * Harmonics-to-noise ratio (dB) via normalized autocorrelation peak
 * (Boersma's estimator). Also returns the detected period in samples.
 */
export function harmonicToNoiseRatio(x, fs, { minHz = 15, maxHz = 400 } = {}) {
  const n = x.length
  const nfft = nextPow2(n * 2)
  const re = new Float64Array(nfft)
  const im = new Float64Array(nfft)
  const w = hann(n)
  let m = 0
  for (let i = 0; i < n; i++) m += x[i]
  m /= n
  for (let i = 0; i < n; i++) re[i] = (x[i] - m) * w[i]
  fft(re, im)
  for (let i = 0; i < nfft; i++) { re[i] = re[i] * re[i] + im[i] * im[i]; im[i] = 0 }
  ifft(re, im)
  const r0 = re[0]
  if (r0 <= 0) return { hnrDb: -Infinity, periodSamples: 0, r: 0 }
  const minLag = Math.max(2, Math.floor(fs / maxHz))
  const maxLag = Math.min(Math.floor(n / 2), Math.floor(fs / minHz))
  let bestLag = 0, bestVal = 0
  for (let lag = minLag; lag <= maxLag; lag++) {
    const v = re[lag] / r0
    if (v > bestVal) { bestVal = v; bestLag = lag }
  }
  const r = Math.max(0, Math.min(0.999999, bestVal))
  return { hnrDb: 10 * Math.log10(r / (1 - r)), periodSamples: bestLag, r }
}

/** Mel filterbank MFCC. */
export function mfcc(power, fs, nfft, { numFilters = 26, numCoeffs = 13, lowHz = 50, highHz = null } = {}) {
  const top = highHz ?? fs / 2
  const hzToMel = (hz) => 2595 * Math.log10(1 + hz / 700)
  const melToHz = (mel) => 700 * (10 ** (mel / 2595) - 1)
  const melLo = hzToMel(lowHz), melHi = hzToMel(top)
  const points = []
  for (let i = 0; i < numFilters + 2; i++) {
    points.push(Math.floor((melToHz(melLo + ((melHi - melLo) * i) / (numFilters + 1)) * nfft) / fs))
  }
  const energies = []
  for (let f = 1; f <= numFilters; f++) {
    let sum = 0
    for (let b = points[f - 1]; b < points[f + 1] && b < power.length; b++) {
      const weight = b <= points[f]
        ? (b - points[f - 1]) / Math.max(1, points[f] - points[f - 1])
        : (points[f + 1] - b) / Math.max(1, points[f + 1] - points[f])
      sum += power[b] * Math.max(0, weight)
    }
    energies.push(Math.log(sum + 1e-12))
  }
  const out = []
  for (let k = 0; k < numCoeffs; k++) {
    let sum = 0
    for (let f = 0; f < numFilters; f++) {
      sum += energies[f] * Math.cos((Math.PI * k * (f + 0.5)) / numFilters)
    }
    out.push(sum)
  }
  return out
}

/**
 * Transient prominence: for a per-window series, how far the biggest peaks
 * stand above the local median, in robust (MAD) units. Higher = a transient
 * event is easier to separate from the ongoing engine sound.
 */
export function transientProminence(series) {
  if (series.length < 5) return { maxZ: 0, countAbove3: 0 }
  const med = median(series)
  const mad = median(series.map((v) => Math.abs(v - med))) || 1e-12
  const z = series.map((v) => (v - med) / (1.4826 * mad))
  return {
    maxZ: Math.max(...z),
    countAbove3: z.filter((v) => v > 3).length,
    z,
  }
}

/** 2nd-order Butterworth low-pass (RBJ biquad), optionally cascaded. */
export function biquadLowPass(x, fs, cutoffHz, stages = 1) {
  let sig = x
  for (let s = 0; s < stages; s++) {
    const w0 = (2 * Math.PI * cutoffHz) / fs
    const cosw = Math.cos(w0), sinw = Math.sin(w0)
    const alpha = sinw / (2 * Math.SQRT1_2)
    const b0 = (1 - cosw) / 2, b1 = 1 - cosw, b2 = (1 - cosw) / 2
    const a0 = 1 + alpha, a1 = -2 * cosw, a2 = 1 - alpha
    const y = new Float32Array(sig.length)
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0
    for (let i = 0; i < sig.length; i++) {
      const xi = sig[i]
      const yi = (b0 / a0) * xi + (b1 / a0) * x1 + (b2 / a0) * x2 - (a1 / a0) * y1 - (a2 / a0) * y2
      y[i] = yi
      x2 = x1; x1 = xi; y2 = y1; y1 = yi
    }
    sig = y
  }
  return sig
}

/** Band-pass = cascaded high-pass then low-pass. */
export function bandPass(x, fs, loHz, hiHz, stages = 2) {
  return biquadLowPass(biquadHighPass(x, fs, loHz, stages), fs, hiHz, stages)
}
