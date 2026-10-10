import { decode, sliceWindows, rms, harmonicToNoiseRatio, percentile } from './lib-dsp.mjs'

const FILES = {
  A: 'D:/Downloads/1789735537560-ENG-03.aac',
  B: 'D:/Downloads/1789277691470-ENG-03.aac',
}

for (const [label, path] of Object.entries(FILES)) {
  const { samples, sampleRateHz } = await decode(path, 22050)
  console.log(`\n=== Recording ${label} — ${path.split('/').pop()}`)
  console.log(`duration ${(samples.length / sampleRateHz).toFixed(2)}s @ ${sampleRateHz}Hz, ${samples.length} samples`)

  const wins = sliceWindows(samples, sampleRateHz, 250, 250)
  const envelope = wins.map((w) => rms(w.samples))
  const peakRms = Math.max(...envelope)

  // compact ASCII envelope, one char per 250ms
  const bar = envelope.map((v) => {
    const n = Math.round((v / peakRms) * 9)
    return '.:123456789'[Math.min(10, n + 1)] ?? '.'
  }).join('')
  console.log('RMS envelope (1 char = 250ms, 0s at left):')
  for (let s = 0; s < bar.length; s += 40) {
    console.log(`  t=${String((s * 0.25).toFixed(1)).padStart(5)}s |${bar.slice(s, s + 40)}|`)
  }

  const phases = { startup: [0, 5000], idle: [5000, 14000], rev: [14000, 23000] }
  for (const [name, [a, b]] of Object.entries(phases)) {
    const sel = wins.filter((w) => w.startMs >= a && w.startMs < b)
    const r = sel.map((w) => rms(w.samples))
    const hnr = sel.map((w) => harmonicToNoiseRatio(w.samples, sampleRateHz).hnrDb)
      .filter((v) => Number.isFinite(v))
    console.log(`  ${name.padEnd(8)} rms mean=${(r.reduce((s, v) => s + v, 0) / r.length).toFixed(4)} ` +
      `min=${Math.min(...r).toFixed(4)} max=${Math.max(...r).toFixed(4)} ` +
      `| HNR median=${percentile(hnr, 50).toFixed(1)}dB`)
  }

  // where does sound actually begin?
  const quiet = percentile(envelope, 5)
  const firstLoud = envelope.findIndex((v) => v > quiet * 4)
  console.log(`  5th-pct RMS floor=${quiet.toFixed(4)}; first window >4x floor at t=${(firstLoud * 0.25).toFixed(2)}s`)
  console.log(`  first 500ms rms=${rms(samples.subarray(0, sampleRateHz / 2)).toFixed(4)}, ` +
    `first 1s rms=${rms(samples.subarray(0, sampleRateHz)).toFixed(4)}, ` +
    `overall rms=${rms(samples).toFixed(4)}`)
}
