// Sanity checks against signals with known answers. If any of these fail the
// measurements in the report would be meaningless.
import {
  fft, ifft, powerSpectrum, nextPow2, harmonicToNoiseRatio, spectralFlatness,
  spectralCentroid, harmonicToFloorDb, spectralGate, bandEnergyProfile,
  onePoleHighPass, biquadHighPass, rms, cohensD,
} from './lib-dsp.mjs'

let failures = 0
function check(name, pass, detail) {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
  if (!pass) failures++
}

const fs = 22050

function tone(freq, n, amp = 1, sr = fs) {
  const x = new Float32Array(n)
  for (let i = 0; i < n; i++) x[i] = amp * Math.sin((2 * Math.PI * freq * i) / sr)
  return x
}
function noise(n, amp = 1) {
  const x = new Float32Array(n)
  for (let i = 0; i < n; i++) x[i] = amp * (Math.random() * 2 - 1)
  return x
}

// 1. FFT round-trip
{
  const n = 1024
  const x = tone(440, n)
  const re = Float64Array.from(x), im = new Float64Array(n)
  fft(re, im); ifft(re, im)
  let maxErr = 0
  for (let i = 0; i < n; i++) maxErr = Math.max(maxErr, Math.abs(re[i] - x[i]))
  check('FFT round-trip reconstructs the signal', maxErr < 1e-9, `max err ${maxErr.toExponential(2)}`)
}

// 2. Peak bin lands on the true tone frequency
{
  const nfft = 4096
  const x = tone(1000, nfft)
  const p = powerSpectrum(x, nfft)
  let best = 0
  for (let i = 1; i < p.length; i++) if (p[i] > p[best]) best = i
  const peakHz = (best * fs) / nfft
  check('Spectral peak matches a 1000 Hz tone', Math.abs(peakHz - 1000) < fs / nfft,
    `found ${peakHz.toFixed(1)} Hz`)
}

// 3. Spectral centroid ordering: a high tone must have a higher centroid
{
  const nfft = 4096
  const c500 = spectralCentroid(powerSpectrum(tone(500, nfft), nfft), fs, nfft)
  const c4000 = spectralCentroid(powerSpectrum(tone(4000, nfft), nfft), fs, nfft)
  check('Spectral centroid rises with tone frequency', c4000 > c500 * 3,
    `500Hz→${c500.toFixed(0)}, 4000Hz→${c4000.toFixed(0)}`)
}

// 4. Flatness: noise ≫ tone
{
  const nfft = 4096
  const fTone = spectralFlatness(powerSpectrum(tone(1000, nfft), nfft))
  const fNoise = spectralFlatness(powerSpectrum(noise(nfft), nfft))
  check('Spectral flatness: noise much flatter than a pure tone', fNoise > fTone * 10,
    `tone ${fTone.toExponential(2)}, noise ${fNoise.toFixed(3)}`)
}

// 5. HNR: clean periodic signal high, white noise low; and period correct
{
  const n = 8192
  const periodic = tone(100, n)
  const h1 = harmonicToNoiseRatio(periodic, fs)
  const h2 = harmonicToNoiseRatio(noise(n), fs)
  const expectedPeriod = fs / 100
  check('HNR high for a periodic signal, low for white noise', h1.hnrDb > 20 && h2.hnrDb < 10,
    `periodic ${h1.hnrDb.toFixed(1)} dB, noise ${h2.hnrDb.toFixed(1)} dB`)
  check('Autocorrelation recovers the true period', Math.abs(h1.periodSamples - expectedPeriod) <= 2,
    `found ${h1.periodSamples}, expected ${expectedPeriod.toFixed(1)}`)
}

// 6. Harmonic-to-floor ratio is monotonic in true SNR
{
  const n = fs * 2
  const mk = (sigAmp, noiseAmp) => {
    const s = tone(300, n, sigAmp), nz = noise(n, noiseAmp)
    const y = new Float32Array(n)
    for (let i = 0; i < n; i++) y[i] = s[i] + nz[i]
    return y
  }
  const lo = harmonicToFloorDb(mk(0.1, 0.5), fs)
  const mid = harmonicToFloorDb(mk(0.3, 0.1), fs)
  const hi = harmonicToFloorDb(mk(0.5, 0.02), fs)
  check('Harmonic-to-floor ratio rises monotonically with real SNR', hi > mid && mid > lo,
    `noisy ${lo.toFixed(1)} → mid ${mid.toFixed(1)} → clean ${hi.toFixed(1)} dB`)
}

// 6b. Pure white noise must score far below a tone buried in the same noise
{
  const n = fs * 2
  const pureNoise = harmonicToFloorDb(noise(n, 0.3), fs)
  const s = tone(300, n, 0.3), nz = noise(n, 0.3)
  const mixed = new Float32Array(n)
  for (let i = 0; i < n; i++) mixed[i] = s[i] + nz[i]
  const withTone = harmonicToFloorDb(mixed, fs)
  check('Structured content scores above pure broadband noise', withTone > pureNoise + 3,
    `noise-only ${pureNoise.toFixed(1)} dB, noise+tone ${withTone.toFixed(1)} dB`)
}

// 7a. Spectral subtraction with a TRUE noise sample (first second is noise only)
{
  const n = fs * 4
  const x = new Float32Array(n)
  const nz = noise(n, 0.15)
  const s = tone(300, n, 0.3)
  for (let i = 0; i < n; i++) x[i] = i < fs ? nz[i] : s[i] + nz[i]   // 0-1s noise only
  const sig = x.subarray(fs)
  const before = harmonicToFloorDb(sig, fs)
  const { signal } = spectralGate(x, fs, { noiseRangeSec: [0, 0.9] })
  const after = harmonicToFloorDb(signal.subarray(fs), fs)
  check('Spectral subtraction with a true noise sample improves harmonic-to-floor', after > before + 2,
    `${before.toFixed(1)} → ${after.toFixed(1)} dB`)
}

// 7b. The textbook time-percentile profile must be shown to FAIL on a
// stationary signal — this is a documented limitation, not a bug.
{
  const n = fs * 3
  const s = tone(300, n, 0.3), nz = noise(n, 0.15)
  const x = new Float32Array(n)
  for (let i = 0; i < n; i++) x[i] = s[i] + nz[i]
  const before = harmonicToFloorDb(x, fs)
  const { signal } = spectralGate(x, fs)   // percentile mode
  const after = harmonicToFloorDb(signal, fs)
  check('Time-percentile noise profile degrades a STATIONARY signal (expected failure mode)',
    after < before,
    `${before.toFixed(1)} → ${after.toFixed(1)} dB — confirms it eats stationary harmonics`)
}

// 8. Band profile assigns energy to the correct band
{
  const n = fs * 2
  const x = tone(7000, n)
  const prof = bandEnergyProfile(x, fs, { low: [0, 5000], knock: [6000, 8000] })
  check('Band profile puts a 7 kHz tone in the 6–8 kHz band',
    prof.knock > 0.9 && prof.low < 0.05,
    `knock ${(prof.knock * 100).toFixed(1)}%, <5k ${(prof.low * 100).toFixed(1)}%`)
}

// 9. High-pass filters actually attenuate below cutoff, and the steeper one more so
{
  const n = fs * 2
  const sub = tone(40, n, 1)
  const one = rms(onePoleHighPass(sub, fs, 20))
  const bi = rms(biquadHighPass(sub, fs, 80, 2))
  check('One-pole 20 Hz HP barely touches a 40 Hz rumble', one > 0.5, `kept ${(one * 100).toFixed(0)}%`)
  check('Cascaded 80 Hz biquad HP removes far more 40 Hz rumble', bi < one / 5,
    `one-pole kept ${(one * 100).toFixed(0)}%, biquad kept ${(bi * 100).toFixed(1)}%`)
}

// 10. Cohen's d sanity
{
  const a = Array.from({ length: 50 }, () => 10 + Math.random())
  const b = Array.from({ length: 50 }, () => 10 + Math.random())
  const c = Array.from({ length: 50 }, () => 50 + Math.random())
  check("Cohen's d: identical distributions ≈ 0, separated ones large",
    cohensD(a, b) < 1 && cohensD(a, c) > 10,
    `same ${cohensD(a, b).toFixed(2)}, different ${cohensD(a, c).toFixed(1)}`)
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`)
process.exit(failures === 0 ? 0 : 1)
