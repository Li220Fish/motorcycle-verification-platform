// Which production features actually change when peak normalization's scale moves?
import { decode, removeDcOffset, onePoleHighPass, peakNormalize, rmsNormalize, rms,
  sliceWindows, powerSpectrum, nextPow2, spectralCentroid, spectralFlatness, mean, peakAmplitude } from './lib-dsp.mjs'
const FS = 22050
for (const [key, path] of Object.entries({A:'D:/Downloads/1789735537560-ENG-03.aac', B:'D:/Downloads/1789277691470-ENG-03.aac'})) {
  const { samples } = await decode(path, FS)
  const raw = onePoleHighPass(removeDcOffset(samples), FS, 20)
  const bumped = Float32Array.from(raw)
  const at = Math.floor(8 * FS)
  for (let i = 0; i < Math.round(0.002 * FS); i++) bumped[at + i] = 0.95 * Math.sin(2*Math.PI*1200*i/FS)

  const feats = (sig, norm) => {
    const n = norm(sig)
    const wins = sliceWindows(n, FS, 250, 125).filter(w => w.startMs>=5000 && w.startMs<14000)
    let prev=null; const flux=[]; const harm=[]; const cen=[]; const flat=[]
    for (const w of wins) {
      const nfft = nextPow2(w.samples.length)
      const p = powerSpectrum(w.samples, nfft)
      const binHz = FS/nfft
      const cap = Math.ceil(5000/binHz)
      const cur = p.subarray(0, cap)
      if (prev && prev.length===cur.length){let f=0;for(let b=0;b<cur.length;b++){const d=cur[b]-prev[b];if(d>0)f+=d}flux.push(f)}
      prev = Float64Array.from(cur)
      let total=0; for(const v of cur) total+=v
      harm.push(total)
      cen.push(spectralCentroid(cur, FS, nfft)); flat.push(spectralFlatness(cur))
    }
    return { flux: mean(flux), harmonicLikeEnergy: mean(harm), centroid: mean(cen), flatness: mean(flat) }
  }
  const pct=(a,b)=> (((b-a)/a)*100).toFixed(2)+'%'
  const pBefore = feats(raw, peakNormalize), pAfter = feats(bumped, peakNormalize)
  const rBefore = feats(raw, s=>rmsNormalize(s)), rAfter = feats(bumped, s=>rmsNormalize(s))
  console.log(`\n=== ${key}  (peak before=${peakAmplitude(raw).toFixed(4)} after=${peakAmplitude(bumped).toFixed(4)})`)
  console.log('feature              peak-norm shift   rms-norm shift')
  for (const f of ['flux','harmonicLikeEnergy','centroid','flatness'])
    console.log(`  ${f.padEnd(20)} ${pct(pBefore[f],pAfter[f]).padStart(10)}  ${pct(rBefore[f],rAfter[f]).padStart(14)}`)
}
