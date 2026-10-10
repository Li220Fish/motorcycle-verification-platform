/**
 * Checks the capture-time quality gate's thresholds against the real evidence
 * photos by reimplementing src/services/media/photo-quality.service.ts exactly
 * (same analysis resolution, same tile grid, same Laplacian kernel, same
 * thresholds) in Node. The browser service cannot be imported here, so this is
 * a port — if the two ever drift, this check stops meaning anything, so keep
 * the constants below in sync with src/config/photoQuality.config.ts.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { sharp } from './lib-image.mjs'

// --- mirror of src/config/photoQuality.config.ts ---
const QUALITY_ANALYSIS_LONG_EDGE = 640
const QUALITY_TILE_GRID = 4
const MIN_MEDIAN_TILE_SHARPNESS = 50
const WARN_MEDIAN_TILE_SHARPNESS = 150
const MIN_BEST_TILE_SHARPNESS = 120
const MIN_MEAN_LUMA = 45
const MAX_CLIPPED_HIGHLIGHT_PCT = 2.0
const DARK_PIXEL_LEVEL = 40
const MAX_DARK_PIXEL_PCT = 80
const MIN_CAPTURE_LONG_EDGE = 1024

const median = (a) => {
  if (!a.length) return 0
  const s = [...a].sort((x, y) => x - y)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

function laplacianVariance(luma, width, x0, y0, tw, th) {
  const v = []
  for (let y = y0 + 1; y < y0 + th - 1; y++) {
    for (let x = x0 + 1; x < x0 + tw - 1; x++) {
      const i = y * width + x
      v.push(-4 * luma[i] + luma[i - 1] + luma[i + 1] + luma[i - width] + luma[i + width])
    }
  }
  if (v.length < 2) return 0
  const m = v.reduce((s, x) => s + x, 0) / v.length
  return v.reduce((s, x) => s + (x - m) ** 2, 0) / v.length
}

async function assess(buffer) {
  const meta = await sharp(buffer).metadata()
  const scale = Math.min(1, QUALITY_ANALYSIS_LONG_EDGE / Math.max(meta.width, meta.height))
  const width = Math.max(1, Math.round(meta.width * scale))
  const height = Math.max(1, Math.round(meta.height * scale))
  const { data } = await sharp(buffer).resize(width, height).removeAlpha().raw()
    .toBuffer({ resolveWithObject: true })

  const luma = new Float32Array(width * height)
  for (let i = 0, p = 0; i < data.length; i += 3, p++) {
    luma[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
  }

  const tw = Math.floor(width / QUALITY_TILE_GRID)
  const th = Math.floor(height / QUALITY_TILE_GRID)
  const tiles = []
  for (let ty = 0; ty < QUALITY_TILE_GRID; ty++) {
    for (let tx = 0; tx < QUALITY_TILE_GRID; tx++) {
      tiles.push(laplacianVariance(luma, width, tx * tw, ty * th, tw, th))
    }
  }

  let sum = 0, clipped = 0, dark = 0
  for (let i = 0; i < luma.length; i++) {
    sum += luma[i]
    if (luma[i] >= 250) clipped++
    if (luma[i] < DARK_PIXEL_LEVEL) dark++
  }

  const m = {
    capturedWidth: meta.width,
    capturedHeight: meta.height,
    bestTileSharpness: +Math.max(...tiles).toFixed(1),
    medianTileSharpness: +median(tiles).toFixed(1),
    meanLuma: +(sum / luma.length).toFixed(1),
    clippedHighlightPct: +((clipped / luma.length) * 100).toFixed(3),
    darkPixelPct: +((dark / luma.length) * 100).toFixed(2),
  }

  const issues = []
  let level = 'ok'
  const raise = (n) => { if (n === 'reject' || (n === 'warn' && level === 'ok')) level = n }

  // resolution is checked once per camera stream in the UI, not per photo
  if (m.bestTileSharpness < MIN_BEST_TILE_SHARPNESS) { issues.push('out_of_focus'); raise('reject') }
  else if (m.medianTileSharpness < MIN_MEDIAN_TILE_SHARPNESS) { issues.push('low_detail'); raise('reject') }
  else if (m.medianTileSharpness < WARN_MEDIAN_TILE_SHARPNESS) { issues.push('low_detail'); raise('warn') }
  if (m.darkPixelPct > MAX_DARK_PIXEL_PCT) { issues.push('too_dark'); raise('reject') }
  else if (m.meanLuma < MIN_MEAN_LUMA) { issues.push('underexposed'); raise('warn') }
  if (m.clippedHighlightPct > MAX_CLIPPED_HIGHLIGHT_PCT) { issues.push('glare'); raise('warn') }

  return { level, issues, metrics: m }
}

const DIR = process.argv[2] ?? 'D:/Downloads/暫存圖片/'
// Expected verdicts, set from looking at each photo before running this.
const EXPECTED = {
  'APR-engine-bottom': 'reject',     // half the frame has no usable detail at all
  'APR-right-side': 'warn',          // very dark but structures still readable
  'APR-rear': 'warn',                // dark; plate still legible
  'APR-front-suspension': 'ok',      // acceptable
  'APR-left-side': 'ok',             // acceptable (rotation is a separate defect)
  'APR-dashboard': 'ok',             // self-lit, clearly the best of the six
}

console.log('photo'.padEnd(26) + 'level   expected  best    median  luma   dark%   issues')
let mismatches = 0
for (const f of readdirSync(DIR).filter((x) => /\.jpe?g$/i.test(x)).sort()) {
  const key = f.replace(/^\d+-/, '').replace(/\.jpe?g$/i, '')
  const r = await assess(readFileSync(DIR + f))
  const expected = EXPECTED[key] ?? '?'
  const match = expected === '?' || expected === r.level
  if (!match) mismatches++
  console.log(
    key.padEnd(26) +
    r.level.padEnd(8) +
    expected.padEnd(10) +
    String(r.metrics.bestTileSharpness).padStart(7) +
    String(r.metrics.medianTileSharpness).padStart(8) +
    String(r.metrics.meanLuma).padStart(7) +
    String(r.metrics.darkPixelPct).padStart(7) + '  ' +
    (r.issues.join(',') || '-') +
    (match ? '' : '   <-- MISMATCH'))
}
console.log(mismatches
  ? `\n${mismatches} photo(s) did not get the expected verdict — thresholds need adjusting`
  : '\nAll six real photos got the expected verdict')
