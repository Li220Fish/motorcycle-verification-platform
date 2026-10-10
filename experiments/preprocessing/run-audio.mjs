/**
 * MotoVerify engine-audio preprocessing experiments.
 * Baseline = what functions/src/ai/engine-audio/ does today.
 * Every candidate changes ONE thing so the measured delta is attributable.
 */
import { writeFileSync } from 'node:fs'
import {
  decode, removeDcOffset, onePoleHighPass, biquadHighPass, peakNormalize, rmsNormalize,
  rms, peakAmplitude, sliceWindows, zeroCrossingRate, powerSpectrum, nextPow2,
  spectralCentroid, spectralFlatness, spectralEntropy, harmonicToNoiseRatio, mfcc,
  harmonicToFloorDb, spectralGate, bandEnergyProfile, transientProminence,
  mean, stdev, cv, cohensD, percentile, median,
} from './lib-dsp.mjs'

const FILES = {
  A: { path: 'D:/Downloads/1789735537560-ENG-03.aac', label: '錄音 A (1789735537560)' },
  B: { path: 'D:/Downloads/1789277691470-ENG-03.aac', label: '錄音 B (1789277691470)' },
}
// System-truth phase boundaries — src/data/verification/engine-session.ts
const PHASES = { startup: [0, 5000], idle: [5000, 14000], rev: [14000, 23000] }
// Production config — functions/src/ai/engine-audio/engine-audio.config.ts
const PROD = { sampleRateHz: 22050, windowMs: 250, hopMs: 125, maxFrequencyHz: 5000,
  frequencyBinHz: 25, highPassCutoffHz: 20 }

const results = { generatedAt: new Date().toISOString(), recordings: {}, experiments: {} }
const log = (...a) => console.log(...a)

/** Production preprocessing, reimplemented exactly. */
function baselinePreprocess(samples, fs) {
  const dc = removeDcOffset(samples)
  const raw = onePoleHighPass(dc, fs, PROD.highPassCutoffHz)
  return { raw, normalized: peakNormalize(raw) }
}

function phaseSlice(x, fs, [a, b]) {
  return x.subarray(Math.floor((a / 1000) * fs), Math.min(x.length, Math.floor((b / 1000) * fs)))
}

/** Per-window feature table used by several experiments. */
function windowFeatures(raw, normalized, fs, windowMs, hopMs, { withExtras = false } = {}) {
  const rawW = sliceWindows(raw, fs, windowMs, hopMs)
  const normW = sliceWindows(normalized, fs, windowMs, hopMs)
  const out = []
  let prev = null
  for (let i = 0; i < rawW.length; i++) {
    const nfft = nextPow2(normW[i].samples.length)
    const p = powerSpectrum(normW[i].samples, nfft)
    const binHz = fs / nfft
    const maxBin = Math.min(p.length, Math.ceil(PROD.maxFrequencyHz / binHz))
    const pLimited = p.subarray(0, maxBin)          // production's 5 kHz ceiling
    let flux = 0
    if (prev && prev.length === pLimited.length) {
      for (let b = 0; b < pLimited.length; b++) {
        const d = pLimited[b] - prev[b]
        if (d > 0) flux += d
      }
    }
    prev = pLimited
    const r = rms(rawW[i].samples)
    const pk = peakAmplitude(rawW[i].samples)
    const f = {
      startMs: rawW[i].startMs,
      rms: r,
      peak: pk,
      crestFactor: r > 0 ? pk / r : 0,
      zcr: zeroCrossingRate(rawW[i].samples),
      centroid: spectralCentroid(pLimited, fs, nfft),
      flatness: spectralFlatness(pLimited),
      entropy: spectralEntropy(pLimited),
      flux,
    }
    if (withExtras) {
      const h = harmonicToNoiseRatio(rawW[i].samples, fs)
      f.hnrDb = Number.isFinite(h.hnrDb) ? h.hnrDb : -40
      f.periodHz = h.periodSamples > 0 ? fs / h.periodSamples : 0
      f.autocorrR = h.r
      const cc = mfcc(p, fs, nfft, { numCoeffs: 5 })
      f.mfcc1 = cc[1]; f.mfcc2 = cc[2]; f.mfcc3 = cc[3]
      // full-band centroid (no 5 kHz cap) for comparison
      f.centroidFull = spectralCentroid(p, fs, nfft)
    }
    out.push(f)
  }
  return out
}

const inPhase = (feats, [a, b]) => feats.filter((f) => f.startMs >= a && f.startMs < b)

// ===========================================================================
log('Loading recordings…')
const loaded = {}
for (const [key, meta] of Object.entries(FILES)) {
  const at22k = await decode(meta.path, 22050)
  const at44k = await decode(meta.path, 44100)
  loaded[key] = { meta, at22k, at44k }
  results.recordings[key] = {
    label: meta.label,
    file: meta.path.split('/').pop(),
    durationSec: +(at22k.samples.length / 22050).toFixed(2),
    overallRms: +rms(at22k.samples).toFixed(4),
    quietPrefixRms1s: +rms(at22k.samples.subarray(0, 22050)).toFixed(4),
  }
}

// ===========================================================================
// EXP-A1 — how much acoustic energy the pipeline never sees
// ===========================================================================
log('\n[EXP-A1] Band coverage vs the 5 kHz analysis ceiling')
results.experiments.A1 = { byRecording: {} }
const BANDS = {
  'b0_500': [0, 500], 'b500_2k': [500, 2000], 'b2k_5k': [2000, 5000],
  'b5k_6k': [5000, 6000], 'b6k_8k': [6000, 8000], 'b8k_11k': [8000, 11025],
  'b11k_16k': [11025, 16000], 'b16k_22k': [16000, 22050],
}
for (const [key, { at44k }] of Object.entries(loaded)) {
  const fs = at44k.sampleRateHz
  const perPhase = {}
  for (const [name, bounds] of Object.entries(PHASES)) {
    const seg = phaseSlice(at44k.samples, fs, bounds)
    const prof = bandEnergyProfile(seg, fs, BANDS)
    const above5k = prof.b5k_6k + prof.b6k_8k + prof.b8k_11k + prof.b11k_16k + prof.b16k_22k
    const lostToDecode = prof.b11k_16k + prof.b16k_22k   // gone at 22.05 kHz decode
    perPhase[name] = {
      bands: Object.fromEntries(Object.entries(prof)
        .filter(([k]) => k !== '__totalPower')
        .map(([k, v]) => [k, +(v * 100).toFixed(2)])),
      pctAbove5k: +(above5k * 100).toFixed(2),
      pctKnockBand6to8k: +(prof.b6k_8k * 100).toFixed(2),
      pctLostAtDecode: +(lostToDecode * 100).toFixed(2),
    }
  }
  results.experiments.A1.byRecording[key] = perPhase
  log(`  ${key}: idle ${perPhase.idle.pctAbove5k}% of energy above 5kHz ` +
    `(6-8kHz knock band ${perPhase.idle.pctKnockBand6to8k}%), ` +
    `rev ${perPhase.rev.pctAbove5k}% / ${perPhase.rev.pctKnockBand6to8k}%`)
}

// ===========================================================================
// EXP-A2 — high-pass filter strength
// ===========================================================================
log('\n[EXP-A2] Low-frequency rumble left behind by the 20 Hz one-pole filter')
results.experiments.A2 = { byRecording: {} }
for (const [key, { at22k }] of Object.entries(loaded)) {
  const fs = at22k.sampleRateHz
  const dc = removeDcOffset(at22k.samples)
  const variants = {
    'none (DC only)': dc,
    'one-pole 20Hz (production)': onePoleHighPass(dc, fs, 20),
    'one-pole 80Hz': onePoleHighPass(dc, fs, 80),
    'biquad 80Hz x2 (4th order)': biquadHighPass(dc, fs, 80, 2),
    'biquad 120Hz x2': biquadHighPass(dc, fs, 120, 2),
  }
  const row = {}
  for (const [name, sig] of Object.entries(variants)) {
    const prof = bandEnergyProfile(sig, fs, { sub50: [0, 50], sub100: [0, 100], band100_5k: [100, 5000] })
    row[name] = {
      pctBelow50Hz: +(prof.sub50 * 100).toFixed(2),
      pctBelow100Hz: +(prof.sub100 * 100).toFixed(2),
      overallRms: +rms(sig).toFixed(4),
      // how much of the useful 100Hz-5kHz band survives, relative to DC-only
      band100_5kRelative: +(prof.band100_5k * 100).toFixed(2),
    }
  }
  results.experiments.A2.byRecording[key] = row
  log(`  ${key}: below-100Hz energy — DC only ${row['none (DC only)'].pctBelow100Hz}%, ` +
    `production ${row['one-pole 20Hz (production)'].pctBelow100Hz}%, ` +
    `biquad80x2 ${row['biquad 80Hz x2 (4th order)'].pctBelow100Hz}%`)
}

// ===========================================================================
// EXP-A3 — peak vs RMS normalization robustness
// ===========================================================================
log('\n[EXP-A3] Normalization robustness to a single impulsive sample')
results.experiments.A3 = { byRecording: {} }
for (const [key, { at22k }] of Object.entries(loaded)) {
  const fs = at22k.sampleRateHz
  const { raw } = baselinePreprocess(at22k.samples, fs)

  // inject one realistic impulsive click (a dropped tool / phone bump):
  // a single 2 ms burst at 0.95 full-scale, placed in the idle phase.
  const bumped = Float32Array.from(raw)
  const at = Math.floor(8 * fs)
  for (let i = 0; i < Math.round(0.002 * fs); i++) {
    bumped[at + i] = 0.95 * Math.sin((2 * Math.PI * 1200 * i) / fs)
  }
  const peakScaleBefore = 1 / peakAmplitude(raw)
  const peakScaleAfter = 1 / peakAmplitude(bumped)
  const rmsScaleBefore = 0.1 / rms(raw)
  const rmsScaleAfter = 0.1 / rms(bumped)

  // what the change does to a downstream spectral feature in the idle phase
  const idleOf = (sig, normFn) => {
    const n = normFn(sig)
    const feats = inPhase(windowFeatures(sig, n, fs, PROD.windowMs, PROD.hopMs), PHASES.idle)
    return { centroid: mean(feats.map((f) => f.centroid)), flatness: mean(feats.map((f) => f.flatness)) }
  }
  const peakBefore = idleOf(raw, peakNormalize)
  const peakAfter = idleOf(bumped, peakNormalize)
  const rmsBefore = idleOf(raw, (s) => rmsNormalize(s))
  const rmsAfter = idleOf(bumped, (s) => rmsNormalize(s))

  const pct = (a, b) => +(((b - a) / a) * 100).toFixed(2)
  results.experiments.A3.byRecording[key] = {
    peakScaleShiftPct: pct(peakScaleBefore, peakScaleAfter),
    rmsScaleShiftPct: pct(rmsScaleBefore, rmsScaleAfter),
    peakNorm_idleFlatnessShiftPct: pct(peakBefore.flatness, peakAfter.flatness),
    rmsNorm_idleFlatnessShiftPct: pct(rmsBefore.flatness, rmsAfter.flatness),
    peakNorm_idleCentroidShiftPct: pct(peakBefore.centroid, peakAfter.centroid),
    rmsNorm_idleCentroidShiftPct: pct(rmsBefore.centroid, rmsAfter.centroid),
  }
  log(`  ${key}: one 2ms click shifts the peak-norm scale by ` +
    `${results.experiments.A3.byRecording[key].peakScaleShiftPct}% ` +
    `vs RMS-norm ${results.experiments.A3.byRecording[key].rmsScaleShiftPct}%`)
}

// ===========================================================================
// EXP-A4 — denoising: true noise sample vs textbook percentile profile
// ===========================================================================
log('\n[EXP-A4] Spectral subtraction (noise profile from the pre-start quiet prefix)')
results.experiments.A4 = { byRecording: {} }
for (const [key, { at22k }] of Object.entries(loaded)) {
  const fs = at22k.sampleRateHz
  const { raw } = baselinePreprocess(at22k.samples, fs)

  // verify the prefix really is engine-free before using it as a noise sample
  const prefixRms = rms(raw.subarray(0, Math.floor(1.0 * fs)))
  const idleRms = rms(phaseSlice(raw, fs, PHASES.idle))
  const prefixMarginDb = 20 * Math.log10(idleRms / Math.max(prefixRms, 1e-9))

  const denoisedTrue = spectralGate(raw, fs, { noiseRangeSec: [0, 1.0], oversubtraction: 1.5 }).signal
  const denoisedNaive = spectralGate(raw, fs, { noisePercentile: 15, oversubtraction: 1.5 }).signal

  const perPhase = {}
  for (const [name, bounds] of Object.entries(PHASES)) {
    if (name === 'startup') continue
    const segBase = phaseSlice(raw, fs, bounds)
    const segTrue = phaseSlice(denoisedTrue, fs, bounds)
    const segNaive = phaseSlice(denoisedNaive, fs, bounds)
    const hnrOf = (seg) => {
      const w = sliceWindows(seg, fs, 250, 125)
      return median(w.map((x) => harmonicToNoiseRatio(x.samples, fs).hnrDb).filter(Number.isFinite))
    }
    perPhase[name] = {
      harmonicToFloorDb: {
        baseline: +harmonicToFloorDb(segBase, fs).toFixed(2),
        trueNoiseProfile: +harmonicToFloorDb(segTrue, fs).toFixed(2),
        percentileProfile: +harmonicToFloorDb(segNaive, fs).toFixed(2),
      },
      hnrMedianDb: {
        baseline: +hnrOf(segBase).toFixed(2),
        trueNoiseProfile: +hnrOf(segTrue).toFixed(2),
        percentileProfile: +hnrOf(segNaive).toFixed(2),
      },
    }
  }
  results.experiments.A4.byRecording[key] = {
    prefixRms: +prefixRms.toFixed(4),
    idleRms: +idleRms.toFixed(4),
    prefixMarginDb: +prefixMarginDb.toFixed(1),
    perPhase,
  }
  log(`  ${key}: prefix is ${prefixMarginDb.toFixed(1)}dB below idle. ` +
    `idle harmonic-to-floor ${perPhase.idle.harmonicToFloorDb.baseline} → ` +
    `${perPhase.idle.harmonicToFloorDb.trueNoiseProfile} dB (true profile), ` +
    `${perPhase.idle.harmonicToFloorDb.percentileProfile} dB (percentile profile)`)
}

// ===========================================================================
// EXP-A5 — analysis window size vs transient visibility
// ===========================================================================
log('\n[EXP-A5] Window size vs transient (tapping / knock) visibility')
results.experiments.A5 = { byRecording: {}, note: 'flux series computed within the idle phase only' }
const WINDOW_SETS = [
  { windowMs: 250, hopMs: 125, label: '250/125 ms (production)' },
  { windowMs: 100, hopMs: 50, label: '100/50 ms' },
  { windowMs: 46, hopMs: 23, label: '46/23 ms' },
  { windowMs: 23, hopMs: 11, label: '23/11 ms' },
]
for (const [key, { at22k }] of Object.entries(loaded)) {
  const fs = at22k.sampleRateHz
  const { raw, normalized } = baselinePreprocess(at22k.samples, fs)
  const rawIdle = phaseSlice(raw, fs, PHASES.idle)
  const normIdle = phaseSlice(normalized, fs, PHASES.idle)
  const row = {}
  for (const w of WINDOW_SETS) {
    const t0 = performance.now()
    const feats = windowFeatures(rawIdle, normIdle, fs, w.windowMs, w.hopMs)
    const ms = performance.now() - t0
    const flux = feats.map((f) => f.flux).slice(1)
    const prom = transientProminence(flux)
    row[w.label] = {
      windowCount: feats.length,
      maxFluxZ: +prom.maxZ.toFixed(2),
      windowsAbove3Sigma: prom.countAbove3,
      pctWindowsAbove3Sigma: +((prom.countAbove3 / Math.max(1, flux.length)) * 100).toFixed(2),
      computeMs: +ms.toFixed(0),
    }
  }
  results.experiments.A5.byRecording[key] = row
  log(`  ${key}: max flux z-score — ` + WINDOW_SETS.map((w) =>
    `${w.label.split(' ')[0]}:${row[w.label].maxFluxZ}`).join('  '))
}

// ===========================================================================
// EXP-A6 — feature discriminability (idle vs rev) and A7 stability
// ===========================================================================
log('\n[EXP-A6/A7] Feature discriminability (idle vs rev) and within-idle stability')
results.experiments.A6 = { byRecording: {} }
results.experiments.A7 = { byRecording: {} }
const CURRENT_FEATURES = ['rms', 'peak', 'crestFactor', 'zcr', 'centroid', 'flatness', 'entropy', 'flux']
const PROPOSED_FEATURES = ['hnrDb', 'periodHz', 'autocorrR', 'mfcc1', 'mfcc2', 'mfcc3', 'centroidFull']
for (const [key, { at22k }] of Object.entries(loaded)) {
  const fs = at22k.sampleRateHz
  const { raw, normalized } = baselinePreprocess(at22k.samples, fs)
  const feats = windowFeatures(raw, normalized, fs, PROD.windowMs, PROD.hopMs, { withExtras: true })
  const idle = inPhase(feats, PHASES.idle)
  const rev = inPhase(feats, PHASES.rev)

  const disc = {}
  for (const f of [...CURRENT_FEATURES, ...PROPOSED_FEATURES]) {
    disc[f] = {
      cohensD: +cohensD(idle.map((w) => w[f]), rev.map((w) => w[f])).toFixed(3),
      inCurrentPipeline: CURRENT_FEATURES.includes(f),
      idleMean: +mean(idle.map((w) => w[f])).toFixed(4),
      revMean: +mean(rev.map((w) => w[f])).toFixed(4),
    }
  }
  results.experiments.A6.byRecording[key] = disc

  // stability: first vs second half of the (steady) idle phase
  const half = Math.floor(idle.length / 2)
  const stab = {}
  for (const f of [...CURRENT_FEATURES, ...PROPOSED_FEATURES]) {
    const a = mean(idle.slice(0, half).map((w) => w[f]))
    const b = mean(idle.slice(half).map((w) => w[f]))
    stab[f] = {
      halfToHalfDriftPct: a !== 0 ? +Math.abs(((b - a) / a) * 100).toFixed(2) : null,
      withinIdleCv: +cv(idle.map((w) => w[f])).toFixed(4),
    }
  }
  results.experiments.A7.byRecording[key] = stab
  const top = Object.entries(disc).sort((x, y) => y[1].cohensD - x[1].cohensD).slice(0, 4)
  log(`  ${key}: strongest idle/rev separators — ` +
    top.map(([n, v]) => `${n} d=${v.cohensD}${v.inCurrentPipeline ? '' : ' (NEW)'}`).join(', '))
}

// ===========================================================================
// EXP-A8 — compute cost: production direct-sum DFT vs FFT
// ===========================================================================
log('\n[EXP-A8] Compute cost — production direct-sum DFT vs FFT')
function productionDft(windowed, fs, maxHz, binHz) {
  const n = windowed.length
  const out = []
  const cap = Math.min(maxHz, fs / 2)
  for (let hz = binHz; hz <= cap; hz += binHz) {
    let re = 0, im = 0
    const omega = (2 * Math.PI * hz) / fs
    for (let i = 0; i < n; i++) {
      const ang = omega * i
      re += windowed[i] * Math.cos(ang)
      im -= windowed[i] * Math.sin(ang)
    }
    out.push({ hz, power: (re * re + im * im) / n })
  }
  return out
}
{
  const { at22k } = loaded.A
  const fs = at22k.sampleRateHz
  const { normalized } = baselinePreprocess(at22k.samples, fs)
  const wins = sliceWindows(normalized, fs, PROD.windowMs, PROD.hopMs)
  const sampleWins = wins.slice(0, 40)

  const t1 = performance.now()
  for (const w of sampleWins) productionDft(w.samples, fs, 5000, 25)
  const dft5k = performance.now() - t1

  const t2 = performance.now()
  for (const w of sampleWins) productionDft(w.samples, fs, 11025, 25)
  const dft11k = performance.now() - t2

  const t3 = performance.now()
  for (const w of sampleWins) powerSpectrum(w.samples, nextPow2(w.samples.length))
  const fftFull = performance.now() - t3

  const scale = wins.length / sampleWins.length
  results.experiments.A8 = {
    windowsMeasured: sampleWins.length,
    windowsPerSession: wins.length,
    perSessionMs: {
      'direct DFT, 5 kHz ceiling (production)': +(dft5k * scale).toFixed(0),
      'direct DFT, extended to 11 kHz': +(dft11k * scale).toFixed(0),
      'FFT, full band to 11 kHz': +(fftFull * scale).toFixed(0),
    },
    fftSpeedupVsProduction: +(dft5k / fftFull).toFixed(1),
    fftSpeedupVsExtendedDft: +(dft11k / fftFull).toFixed(1),
  }
  log(`  per 23s session: production DFT ${(dft5k * scale).toFixed(0)}ms (5kHz), ` +
    `extended DFT ${(dft11k * scale).toFixed(0)}ms (11kHz), ` +
    `FFT ${(fftFull * scale).toFixed(0)}ms (full band) → ${(dft11k / fftFull).toFixed(1)}x faster than extended DFT`)
}

writeFileSync('audio-results.json', JSON.stringify(results, null, 2))
log('\nWrote audio-results.json')
