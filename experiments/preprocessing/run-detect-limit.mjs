/**
 * EXP-I6 — the detectability boundary of the current delivery pipeline.
 *
 * A grid of synthetic defects spanning width (how fine) x contrast (how
 * subtle), pushed through the real two-stage path, scored by contrast-to-noise
 * ratio at the delivered resolution. CNR >= 3 is the usual "reliably visible"
 * line (Rose criterion territory); below ~1 the defect is indistinguishable
 * from noise. The output is the smallest defect the pipeline can still carry.
 */
import { writeFileSync } from 'node:fs'
import { sharp, toGray, lineProfileCnr } from './lib-image.mjs'

const W = 4032, H = 3024                 // capture resolution
const WIDTHS = [1, 2, 3, 5, 8, 13, 21]   // defect width in capture pixels
const CONTRASTS = [3, 6, 10, 16, 25, 40, 64]  // |defect - background| in DN
const BASE = 128
const NOISE_SIGMA = 3.0
const CELL_W = 500, CELL_H = 380, MARGIN = 60
const CNR_VISIBLE = 3.0, CNR_MARGINAL = 1.0

function buildGrid() {
  const data = Buffer.alloc(W * H)
  let seed = 4242
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 }
  for (let i = 0; i < data.length; i++) {
    const g = (rnd() + rnd() + rnd() + rnd() - 2) * NOISE_SIGMA
    data[i] = Math.max(0, Math.min(255, Math.round(BASE + g)))
  }
  const cells = []
  CONTRASTS.forEach((contrast, row) => {
    WIDTHS.forEach((width, col) => {
      const x0 = MARGIN + col * CELL_W
      const y0 = MARGIN + row * CELL_H
      const lineY0 = y0 + 40, lineH = CELL_H - 120
      for (let dy = 0; dy < lineH; dy++) {
        for (let dx = 0; dx < width; dx++) {
          const x = x0 + 200 + dx, y = lineY0 + dy
          if (x < W && y < H) {
            const i = y * W + x
            data[i] = Math.max(0, Math.min(255, data[i] + contrast))
          }
        }
      }
      cells.push({
        width, contrast,
        lineX: x0 + 200 + width / 2,     // line centre, in capture pixels
        lineY: lineY0 + 10, lineH: lineH - 20,
        halfSpan: 150,                    // profile half-width around the line
      })
    })
  })
  return { buffer: sharp(data, { raw: { width: W, height: H, channels: 1 } }).png().toBuffer(), cells }
}

const resizeJpeg = (buf, longEdge, quality) =>
  sharp(buf).resize({ width: longEdge, height: longEdge, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality }).toBuffer()

const PIPELINES = {
  // What ACTUALLY ships: CorePhotoCaptureFlow grabs the getUserMedia frame,
  // which arrives at the browser default (640 long edge) because
  // live-camera.service.ts requests no resolution. compressImage only ever
  // downscales, so MAX_LONG_EDGE=1600 never applies, and the server's 1280
  // resize is a no-op on a 640px file — only its re-encode takes effect.
  'AS SHIPPED (640 capture → 1280 no-op → re-encode)': async (b) =>
    resizeJpeg(await resizeJpeg(b, 640, 92), 1280, 78),
  'configured intent (1600@80 → 1280@78)': async (b) => resizeJpeg(await resizeJpeg(b, 1600, 80), 1280, 78),
  'single pass 1280@78': (b) => resizeJpeg(b, 1280, 78),
  'single pass 1600@85': (b) => resizeJpeg(b, 1600, 85),
  'single pass 2048@85': (b) => resizeJpeg(b, 2048, 85),
  'uncompressed 1280 (reference)': (b) =>
    sharp(b).resize({ width: 1280, height: 1280, fit: 'inside' }).png().toBuffer(),
}

const { buffer: gridP, cells } = buildGrid()
const grid = await gridP
await sharp(grid).resize(900).jpeg({ quality: 90 }).toFile('grid-preview.jpg')

const results = { generatedAt: new Date().toISOString(), widthsPx: WIDTHS, contrastsDn: CONTRASTS,
  noiseSigmaDn: NOISE_SIGMA, cnrVisible: CNR_VISIBLE, pipelines: {} }

for (const [name, run] of Object.entries(PIPELINES)) {
  const buf = await run(grid)
  const gray = await toGray(buf)
  const table = {}
  let visibleCount = 0
  for (const c of cells) {
    const value = lineProfileCnr(gray, c, W)
    table[`w${c.width}_c${c.contrast}`] = value
    if (value >= CNR_VISIBLE) visibleCount++
  }
  // smallest surviving defect per contrast level
  const boundary = {}
  for (const contrast of CONTRASTS) {
    const okWidth = WIDTHS.find((w) => table[`w${w}_c${contrast}`] >= CNR_VISIBLE)
    boundary[contrast] = okWidth ?? null
  }
  results.pipelines[name] = { bytes: buf.length, kb: +(buf.length / 1024).toFixed(1),
    deliveredWidth: gray.width, cnr: table, visibleCells: visibleCount,
    totalCells: cells.length, minVisibleWidthByContrast: boundary }

  console.log(`\n=== ${name}  (${gray.width}px, ${(buf.length / 1024).toFixed(0)} KB) ` +
    `— ${visibleCount}/${cells.length} defects visible at CNR>=${CNR_VISIBLE}`)
  console.log('   CNR   ' + WIDTHS.map((w) => `${w}px`.padStart(8)).join(''))
  for (const contrast of CONTRASTS) {
    console.log(`  ${String(contrast).padStart(3)} DN ` +
      WIDTHS.map((w) => {
        const v = table[`w${w}_c${contrast}`]
        const mark = v >= CNR_VISIBLE ? '' : (v >= CNR_MARGINAL ? '?' : '·')
        return `${v.toFixed(1)}${mark}`.padStart(8)
      }).join(''))
  }
}

writeFileSync('detect-limit-results.json', JSON.stringify(results, null, 2))
console.log('\n(· = invisible, ? = marginal)   Wrote detect-limit-results.json')
