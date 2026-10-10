/**
 * MotoVerify image-pipeline experiments (v2 — detection-theoretic metrics).
 *
 * Production delivery path, read from the code:
 *   capture → client resize 1600 long edge @ JPEG 0.80  (src/config/imageUpload.config.ts)
 *           → server resize 1280 long edge @ JPEG 78    (functions/src/services/evidence.service.ts)
 *           → Gemini.  No enhancement anywhere on that path.
 *
 * Defect visibility is measured as contrast-to-noise ratio (CNR) against the
 * feature's own immediate surroundings, so compression noise cannot masquerade
 * as detail. CNR < ~1 means the defect is indistinguishable from local noise.
 */
import { writeFileSync } from 'node:fs'
import {
  sharp, CHART, buildChart, degrade, toGray, laplacianVariance, basicStats,
  ssim, psnr, cnr, michelson,
} from './lib-image.mjs'

const CLIENT_LONG_EDGE = 1600, CLIENT_QUALITY = 80
const SERVER_LONG_EDGE = 1280, SERVER_QUALITY = 78

const resizeJpeg = (buf, longEdge, quality, extra = (p) => p) =>
  extra(sharp(buf).resize({ width: longEdge, height: longEdge, fit: 'inside', withoutEnlargement: true }))
    .jpeg({ quality }).toBuffer()

async function productionPipeline(buf, {
  clientLongEdge = CLIENT_LONG_EDGE, clientQuality = CLIENT_QUALITY,
  serverLongEdge = SERVER_LONG_EDGE, serverQuality = SERVER_QUALITY, enhance } = {}) {
  const client = await resizeJpeg(buf, clientLongEdge, clientQuality)
  return resizeJpeg(client, serverLongEdge, serverQuality, enhance)
}
const singlePassPipeline = (buf, { serverLongEdge = SERVER_LONG_EDGE, serverQuality = SERVER_QUALITY, enhance } = {}) =>
  resizeJpeg(buf, serverLongEdge, serverQuality, enhance)

// ---- chart regions -------------------------------------------------------
const scratchFeature = (i) => {
  const w = CHART.scratchWidthsPx[i]
  const x0 = CHART.scratchX0 + i * CHART.scratchSpacingX
  return {
    feature: { x: x0, y: CHART.scratchY + 20, w, h: CHART.scratchLen - 40 },
    bg: [
      { x: x0 - 40, y: CHART.scratchY + 20, w: 25, h: CHART.scratchLen - 40 },
      { x: x0 + w + 15, y: CHART.scratchY + 20, w: 25, h: CHART.scratchLen - 40 },
    ],
  }
}
const patternRegion = (i) => {
  const bandH = Math.floor(CHART.finePatternH / CHART.finePatternPeriods.length)
  return { x: CHART.finePatternX, y: CHART.finePatternY + i * bandH, w: CHART.finePatternW, h: bandH - 12 }
}
const RUST = { x: CHART.rustX, y: CHART.rustY, w: CHART.rustW, h: CHART.rustH }
const textRegion = (i) => ({ x: CHART.textX, y: CHART.textY + i * Math.floor(CHART.textH / 4),
  w: CHART.textW, h: Math.floor(CHART.textH / 4) - 6 })

async function measure(buffer) {
  const gray = await toGray(buffer)
  const scratchCnr = {}
  CHART.scratchWidthsPx.forEach((w, i) => {
    const { feature, bg } = scratchFeature(i)
    scratchCnr[`${w}px`] = cnr(gray, feature, bg, CHART.width)
  })
  const patternContrast = {}
  CHART.finePatternPeriods.forEach((p, i) => {
    patternContrast[`period${p}px`] = michelson(gray, patternRegion(i), CHART.width)
  })
  const textContrast = {}
  ;[0, 1, 2, 3].forEach((i) => {
    textContrast[`stroke${3 + i * 4}px`] = michelson(gray, textRegion(i), CHART.width)
  })
  return {
    gray,
    metrics: {
      bytes: buffer.length, kb: +(buffer.length / 1024).toFixed(1),
      width: gray.width, height: gray.height,
      sharpnessLapVar: +laplacianVariance(gray).toFixed(2),
      ...basicStats(gray),
      scratchCnr,
      patternContrast,
      textContrast,
      rustContrast: michelson(gray, RUST, CHART.width),
    },
  }
}

const DETECTABLE = 1.0   // CNR below this = indistinguishable from local noise
const results = { generatedAt: new Date().toISOString(),
  pipeline: { CLIENT_LONG_EDGE, CLIENT_QUALITY, SERVER_LONG_EDGE, SERVER_QUALITY },
  cnrDetectabilityThreshold: DETECTABLE, experiments: {} }

console.log('Building chart…')
const chart = await buildChart()
const ref = await measure(chart)
results.chartReference = ref.metrics
console.log(`  reference (4032px, uncompressed) scratch CNR: ${JSON.stringify(ref.metrics.scratchCnr)}`)

// ===========================================================================
console.log('\n[EXP-I1] Two-stage (production) vs single compression')
{
  const prod = await measure(await productionPipeline(chart))
  const single = await measure(await singlePassPipeline(chart))
  results.experiments.I1 = {
    production: prod.metrics, singlePass: single.metrics,
    ssim: +ssim(single.gray, prod.gray).toFixed(5),
    psnrDb: +psnr(single.gray, prod.gray).toFixed(2),
    payloadDeltaPct: +(((prod.metrics.bytes - single.metrics.bytes) / single.metrics.bytes) * 100).toFixed(1),
  }
  console.log(`  SSIM=${results.experiments.I1.ssim} PSNR=${results.experiments.I1.psnrDb}dB ` +
    `payload ${results.experiments.I1.payloadDeltaPct}% (double vs single compression)`)
  console.log(`  scratch CNR  double: ${JSON.stringify(prod.metrics.scratchCnr)}`)
  console.log(`  scratch CNR  single: ${JSON.stringify(single.metrics.scratchCnr)}`)
}

// ===========================================================================
console.log('\n[EXP-I2] Resolution: the client cap is the binding constraint')
results.experiments.I2 = { byConfig: {} }
for (const [clientCap, serverCap] of [[1600, 800], [1600, 1024], [1600, 1280], [1600, 1600],
  [1600, 2048], [2048, 2048], [3024, 2048], [4032, 2048]]) {
  const buf = await productionPipeline(chart, { clientLongEdge: clientCap, serverLongEdge: serverCap })
  const { metrics } = await measure(buf)
  const key = `client${clientCap}_server${serverCap}`
  results.experiments.I2.byConfig[key] = metrics
  const visible = Object.entries(metrics.scratchCnr).filter(([, v]) => v >= DETECTABLE).map(([k]) => k)
  console.log(`  client ${String(clientCap).padStart(4)} → server ${String(serverCap).padStart(4)}  ` +
    `delivered ${String(metrics.width).padStart(4)}px ${String(metrics.kb).padStart(6)}KB  ` +
    `scratches CNR>=1: ${visible.join(',') || 'NONE'}  | 4px-period pattern contrast ${metrics.patternContrast.period4px}`)
}

// ===========================================================================
console.log('\n[EXP-I3] Enhancement under realistic capture degradations')
const ENHANCERS = {
  'none (production)': (p) => p,
  'normalize': (p) => p.normalize(),
  'CLAHE': (p) => p.clahe({ width: 64, height: 64, maxSlope: 3 }),
  'sharpen': (p) => p.sharpen({ sigma: 1.2 }),
  'median+sharpen': (p) => p.median(3).sharpen({ sigma: 1.2 }),
  'normalize+sharpen': (p) => p.normalize().sharpen({ sigma: 1.2 }),
}
results.experiments.I3 = { byDegradation: {} }
for (const kind of ['clean', 'lowlight', 'glare', 'blur']) {
  const degraded = await degrade(chart, kind)
  const row = {}
  console.log(`  ${kind}:`)
  for (const [name, enhance] of Object.entries(ENHANCERS)) {
    const { metrics } = await measure(await productionPipeline(degraded, { enhance }))
    row[name] = metrics
    const sc = metrics.scratchCnr
    const meanBig = (sc['5px'] + sc['8px'] + sc['13px']) / 3
    const meanSmall = (sc['1px'] + sc['2px'] + sc['3px']) / 3
    console.log(`    ${name.padEnd(20)} CNR small(1-3px)=${meanSmall.toFixed(2)} big(5-13px)=${meanBig.toFixed(2)} ` +
      `| text(stroke15) ${metrics.textContrast.stroke15px} | rust ${metrics.rustContrast} ` +
      `| lapVar ${metrics.sharpnessLapVar}`)
  }
  results.experiments.I3.byDegradation[kind] = row
}

// ===========================================================================
console.log('\n[EXP-I4] Cheap pre-analysis quality gate — separability')
results.experiments.I4 = { byDegradation: {} }
for (const kind of ['clean', 'lowlight', 'glare', 'blur']) {
  const { metrics } = await measure(await productionPipeline(await degrade(chart, kind)))
  results.experiments.I4.byDegradation[kind] = {
    sharpnessLapVar: metrics.sharpnessLapVar, meanLuma: metrics.meanLuma,
    rmsContrast: metrics.rmsContrast, clippedHighlightPct: metrics.clippedHighlightPct,
    clippedShadowPct: metrics.clippedShadowPct, entropyBits: metrics.entropyBits,
    meanScratchCnr: +(Object.values(metrics.scratchCnr).reduce((s, v) => s + v, 0) / 6).toFixed(2),
  }
  const m = results.experiments.I4.byDegradation[kind]
  console.log(`  ${kind.padEnd(9)} lapVar=${String(m.sharpnessLapVar).padStart(8)} luma=${String(m.meanLuma).padStart(6)} ` +
    `contrast=${String(m.rmsContrast).padStart(6)} clipHi=${String(m.clippedHighlightPct).padStart(6)}% ` +
    `→ mean scratch CNR ${m.meanScratchCnr}`)
}

// ===========================================================================
console.log('\n[EXP-I5] JPEG quality sweep (delivered at 1280px)')
results.experiments.I5 = { byQuality: {} }
{
  const refQ = await measure(await singlePassPipeline(chart, { serverQuality: 100 }))
  for (const q of [50, 60, 70, 78, 85, 92, 97]) {
    const { metrics, gray } = await measure(await productionPipeline(chart, { serverQuality: q }))
    const row = {
      kb: metrics.kb,
      ssimVsQ100: +ssim(refQ.gray, gray).toFixed(4),
      psnrVsQ100: +psnr(refQ.gray, gray).toFixed(2),
      scratchCnr1px: metrics.scratchCnr['1px'],
      scratchCnr3px: metrics.scratchCnr['3px'],
      scratchCnr8px: metrics.scratchCnr['8px'],
      pattern4px: metrics.patternContrast.period4px,
      textStroke3px: metrics.textContrast.stroke3px,
    }
    results.experiments.I5.byQuality[q] = row
    console.log(`  q=${String(q).padStart(3)} ${String(row.kb).padStart(6)}KB SSIM=${row.ssimVsQ100} ` +
      `PSNR=${String(row.psnrVsQ100).padStart(6)}dB | CNR 1px=${String(row.scratchCnr1px).padStart(6)} ` +
      `3px=${String(row.scratchCnr3px).padStart(6)} 8px=${String(row.scratchCnr8px).padStart(6)} | text3px=${row.textStroke3px}`)
  }
}

writeFileSync('image-results.json', JSON.stringify(results, null, 2))
console.log('\nWrote image-results.json')
