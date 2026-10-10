/**
 * EXP-R2 — how much real fine detail survives at the resolution actually
 * delivered, measured on real text targets in the real evidence photos.
 *
 * Targets: the odometer digits (the dashboard-ocr-v2 route's actual subject)
 * and the rear licence plate. Both are real, known-legible content, so their
 * stroke width and edge contrast say directly how close the current capture
 * resolution sits to the limit. Resolution can only be simulated downwards
 * from what was delivered, so this measures the SLOPE around the operating
 * point rather than what a higher-resolution capture would have given.
 */
import { writeFileSync } from 'node:fs'
import { sharp, toGray, laplacianVariance } from './lib-image.mjs'

const TARGETS = {
  'odometer digits (42443)': {
    file: 'D:/Downloads/暫存圖片/1789735381731-APR-dashboard.jpg',
    region: { left: 228, top: 392, width: 120, height: 30 },
  },
  'licence plate (NKZ-7323)': {
    file: 'D:/Downloads/暫存圖片/1789735392605-APR-rear.jpg',
    region: { left: 193, top: 352, width: 110, height: 32 },
  },
}

const pctl = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.round((p / 100) * (s.length - 1)))] }

/** Mean run length of the dark (glyph) and light (background) stretches along
 *  each scan line — a direct estimate of stroke width in pixels. */
function strokeWidth(gray) {
  const runs = []
  for (let y = 0; y < gray.height; y++) {
    const row = []
    for (let x = 0; x < gray.width; x++) row.push(gray.data[y * gray.width + x])
    const mid = (pctl(row, 10) + pctl(row, 90)) / 2
    let run = 0, prev = null
    for (const v of row) {
      const dark = v < mid
      if (prev === null || dark === prev) run++
      else { if (run > 0 && run < gray.width / 2) runs.push(run); run = 1 }
      prev = dark
    }
  }
  if (!runs.length) return 0
  return +(pctl(runs, 50)).toFixed(2)
}

function michelson(gray) {
  const vals = Array.from(gray.data)
  const hi = pctl(vals, 95), lo = pctl(vals, 5)
  return +((hi - lo) / Math.max(hi + lo, 1)).toFixed(4)
}

/** Edge transition width: how many pixels it takes to go from dark to light.
 *  A sharp, well-resolved glyph edge transitions in ~1-2 px. */
function edgeWidth(gray) {
  let total = 0, count = 0
  for (let y = 0; y < gray.height; y++) {
    const row = []
    for (let x = 0; x < gray.width; x++) row.push(gray.data[y * gray.width + x])
    const hi = pctl(row, 90), lo = pctl(row, 10)
    if (hi - lo < 20) continue
    const t1 = lo + (hi - lo) * 0.2, t2 = lo + (hi - lo) * 0.8
    for (let x = 1; x < row.length; x++) {
      if ((row[x - 1] < t1 && row[x] > t1) || (row[x - 1] > t1 && row[x] < t1)) {
        // walk to the 80% level
        let d = 0
        for (let k = x; k < Math.min(row.length, x + 8); k++) {
          d++
          if ((row[x] > row[x - 1] && row[k] >= t2) || (row[x] < row[x - 1] && row[k] <= t2)) break
        }
        total += d; count++
      }
    }
  }
  return count ? +(total / count).toFixed(2) : 0
}

const results = { generatedAt: new Date().toISOString(), note: 'resolution can only be simulated downward from the delivered 480x640', targets: {} }

for (const [name, { file, region }] of Object.entries(TARGETS)) {
  const meta = await sharp(file).metadata()
  console.log(`\n=== ${name}`)
  console.log(`    source ${meta.width}x${meta.height}, target region ${region.width}x${region.height} px`)
  const rows = {}
  for (const scale of [1.0, 0.75, 0.5, 0.375]) {
    // simulate a lower capture resolution: downscale the WHOLE frame, then
    // take the proportionally-scaled region, exactly as a lower-res capture
    // of the same scene would have delivered it
    const w = Math.round(meta.width * scale)
    const resized = await sharp(file).resize({ width: w }).jpeg({ quality: 92 }).toBuffer()
    const crop = await sharp(resized).extract({
      left: Math.round(region.left * scale), top: Math.round(region.top * scale),
      width: Math.max(4, Math.round(region.width * scale)),
      height: Math.max(4, Math.round(region.height * scale)),
    }).png().toBuffer()
    const gray = await toGray(crop)
    const row = {
      simulatedFrameLongEdge: Math.round(meta.height * scale),
      regionPx: `${gray.width}x${gray.height}`,
      strokeWidthPx: strokeWidth(gray),
      michelsonContrast: michelson(gray),
      edgeTransitionPx: edgeWidth(gray),
      lapVar: +laplacianVariance(gray).toFixed(1),
    }
    rows[scale] = row
    console.log(`    長邊 ${String(row.simulatedFrameLongEdge).padStart(4)} px  區域 ${row.regionPx.padEnd(8)} ` +
      `筆畫寬 ${String(row.strokeWidthPx).padStart(5)} px  對比 ${String(row.michelsonContrast).padStart(7)}  ` +
      `邊緣過渡 ${String(row.edgeTransitionPx).padStart(5)} px  銳利度 ${row.lapVar}`)
  }
  results.targets[name] = { file: file.split('/').pop(), region, byScale: rows }
}

writeFileSync('real-detail-results.json', JSON.stringify(results, null, 2))
console.log('\nWrote real-detail-results.json')
