// Did the denoiser actually DO anything? And is recording B clipping?
import {
  decode, removeDcOffset, onePoleHighPass, peakNormalize, rms, peakAmplitude,
  spectralGate, bandEnergyProfile, harmonicToFloorDb, sliceWindows, harmonicToNoiseRatio, median,
} from './lib-dsp.mjs'

const FILES = { A: 'D:/Downloads/1789735537560-ENG-03.aac', B: 'D:/Downloads/1789277691470-ENG-03.aac' }
const fsTarget = 22050

for (const [key, path] of Object.entries(FILES)) {
  const { samples } = await decode(path, fsTarget)
  const fs = fsTarget
  const raw = onePoleHighPass(removeDcOffset(samples), fs, 20)

  console.log(`\n=== ${key}`)
  // --- clipping check (production thresholds: |x| >= 0.98) ---
  const pk = peakAmplitude(raw)
  let clipped = 0
  for (let i = 0; i < raw.length; i++) if (Math.abs(raw[i]) >= 0.98) clipped++
  let near = 0
  for (let i = 0; i < raw.length; i++) if (Math.abs(raw[i]) >= 0.90) near++
  console.log(`peak=${pk.toFixed(4)}  samples>=0.98: ${clipped} (${(clipped / raw.length * 100).toFixed(4)}%)  >=0.90: ${near} (${(near / raw.length * 100).toFixed(4)}%)`)

  // --- is the denoiser actually changing the signal? ---
  const { signal: dTrue, noiseProfile } = spectralGate(raw, fs, { noiseRangeSec: [0, 1.0], oversubtraction: 1.5 })
  const { signal: dNaive } = spectralGate(raw, fs, { noisePercentile: 15, oversubtraction: 1.5 })
  const diffTrue = new Float32Array(raw.length)
  for (let i = 0; i < raw.length; i++) diffTrue[i] = raw[i] - dTrue[i]
  const diffNaive = new Float32Array(raw.length)
  for (let i = 0; i < raw.length; i++) diffNaive[i] = raw[i] - dNaive[i]

  console.log(`raw rms=${rms(raw).toFixed(5)}`)
  console.log(`true-profile:  out rms=${rms(dTrue).toFixed(5)}  removed rms=${rms(diffTrue).toFixed(5)} ` +
    `(${(rms(diffTrue) / rms(raw) * 100).toFixed(1)}% of signal rms)`)
  console.log(`pctile-profile out rms=${rms(dNaive).toFixed(5)}  removed rms=${rms(diffNaive).toFixed(5)} ` +
    `(${(rms(diffNaive) / rms(raw) * 100).toFixed(1)}% of signal rms)`)

  // --- did it clean the QUIET PREFIX (where it should obviously work)? ---
  const pre = (x) => rms(x.subarray(0, Math.floor(1.0 * fs)))
  console.log(`quiet prefix rms: raw=${pre(raw).toFixed(5)} → true-profile=${pre(dTrue).toFixed(5)} ` +
    `(${(20 * Math.log10(pre(dTrue) / pre(raw))).toFixed(1)} dB)`)

  // --- what IS the noise, during the engine-running part? ---
  // compare the ambient spectrum (prefix) against the idle spectrum shape
  const idleSeg = raw.subarray(Math.floor(5 * fs), Math.floor(14 * fs))
  const preSeg = raw.subarray(0, Math.floor(1.0 * fs))
  const bands = { b0_100: [0, 100], b100_500: [100, 500], b500_2k: [500, 2000], b2k_5k: [2000, 5000], b5k_11k: [5000, 11025] }
  const pIdle = bandEnergyProfile(idleSeg, fs, bands)
  const pPre = bandEnergyProfile(preSeg, fs, bands)
  console.log('band shares (%)        0-100  100-500  500-2k  2k-5k  5k-11k')
  const fmt = (p) => Object.keys(bands).map((k) => (p[k] * 100).toFixed(1).padStart(7)).join('')
  console.log(`  ambient prefix:    ${fmt(pPre)}`)
  console.log(`  idle (engine on):  ${fmt(pIdle)}`)
  // absolute power, not share — is ambient even comparable in level?
  console.log(`  total power ratio idle/ambient = ${(pIdle.__totalPower / pPre.__totalPower).toFixed(1)}x`)

  // HNR effect
  const hnrOf = (x) => median(sliceWindows(x, fs, 250, 125)
    .map((w) => harmonicToNoiseRatio(w.samples, fs).hnrDb).filter(Number.isFinite))
  console.log(`idle HNR median: raw=${hnrOf(idleSeg).toFixed(2)}dB ` +
    `true=${hnrOf(dTrue.subarray(Math.floor(5 * fs), Math.floor(14 * fs))).toFixed(2)}dB ` +
    `pctile=${hnrOf(dNaive.subarray(Math.floor(5 * fs), Math.floor(14 * fs))).toFixed(2)}dB`)
}
