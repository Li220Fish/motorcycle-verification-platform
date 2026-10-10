// Image test-chart generation + no-reference / full-reference quality metrics.
import { createRequire } from 'node:module'
// sharp comes from the Cloud Functions workspace, resolved relative to this
// file so the experiment runs on any checkout, not just one machine.
const require = createRequire(new URL('../../functions/package.json', import.meta.url))
export const sharp = require('sharp')

// ---------------------------------------------------------------- test chart
/**
 * A synthetic inspection target whose ground truth is known by construction.
 * Built at a realistic phone-capture resolution so the whole delivery pipeline
 * (client resize → JPEG → server resize → JPEG) can be measured end to end.
 *
 * Contents, chosen to mirror what the AI items actually have to judge:
 *  - hairline scratches at known widths (paint/panel damage)
 *  - a fine repeating pattern (chain links / cooling fins)
 *  - rust-like speckle patches (corrosion)
 *  - a serial-number text block (OCR targets: VIN / engine number)
 *  - flat paint areas (for noise and banding measurement)
 */
export const CHART = {
  width: 4032, height: 3024,     // 12 MP, typical phone capture
  scratchWidthsPx: [1, 2, 3, 5, 8, 13],
  scratchY: 700,
  scratchSpacingX: 560,
  scratchX0: 300,
  scratchLen: 420,
  finePatternX: 300, finePatternY: 1400, finePatternW: 1600, finePatternH: 500,
  finePatternPeriods: [4, 8, 16, 32],
  rustX: 2200, rustY: 1400, rustW: 1500, rustH: 500,
  textX: 300, textY: 2200, textW: 3400, textH: 400,
  flatX: 300, flatY: 2700, flatW: 600, flatH: 250,
}

export async function buildChart({ noiseSigma = 3.0 } = {}) {
  // noiseSigma: per-pixel sensor noise in DN. 3.0 DN is a realistic clean
  // base-ISO phone capture; without it the chart has a near-zero noise floor
  // and every contrast-to-noise figure measured against it is meaningless.
  const { width, height } = CHART
  const data = Buffer.alloc(width * height, 0)
  const px = (x, y, v) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    data[y * width + x] = Math.max(0, Math.min(255, Math.round(v)))
  }

  // base: mid-grey painted panel with a gentle lighting gradient + faint texture
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const grad = 118 + 26 * (x / width) + 14 * (y / height)
      const texture = 2.0 * Math.sin(x * 0.37) * Math.cos(y * 0.29)
      data[y * width + x] = Math.max(0, Math.min(255, Math.round(grad + texture)))
    }
  }

  // hairline scratches — bright, known widths
  CHART.scratchWidthsPx.forEach((w, i) => {
    const x0 = CHART.scratchX0 + i * CHART.scratchSpacingX
    for (let dy = 0; dy < CHART.scratchLen; dy++) {
      for (let dx = 0; dx < w; dx++) px(x0 + dx, CHART.scratchY + dy, 214)
    }
  })

  // fine repeating pattern — chain links / fins at several spatial periods
  CHART.finePatternPeriods.forEach((period, i) => {
    const bandH = Math.floor(CHART.finePatternH / CHART.finePatternPeriods.length)
    const y0 = CHART.finePatternY + i * bandH
    for (let y = y0; y < y0 + bandH - 8; y++) {
      for (let x = CHART.finePatternX; x < CHART.finePatternX + CHART.finePatternW; x++) {
        px(x, y, (Math.floor((x - CHART.finePatternX) / period) % 2 === 0) ? 86 : 182)
      }
    }
  })

  // rust-like speckle: deterministic pseudo-random blobs
  let seed = 12345
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 }
  for (let k = 0; k < 9000; k++) {
    const cx = CHART.rustX + rnd() * CHART.rustW
    const cy = CHART.rustY + rnd() * CHART.rustH
    const r = 1 + rnd() * 4
    const v = 70 + rnd() * 45
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy <= r * r) px(Math.round(cx + dx), Math.round(cy + dy), v)
      }
    }
  }

  // serial-number block: blocky glyphs at several stroke widths
  const glyphs = '8A3F5C9D2E7B4K6M'
  for (let scale = 0; scale < 4; scale++) {
    const strokeW = 3 + scale * 4
    const gh = strokeW * 7
    const gw = strokeW * 5
    const y0 = CHART.textY + scale * Math.floor(CHART.textH / 4)
    for (let g = 0; g < glyphs.length; g++) {
      const x0 = CHART.textX + g * (gw + strokeW * 2)
      const code = glyphs.charCodeAt(g)
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 5; c++) {
          if (((code >> ((r * 5 + c) % 8)) & 1) === 0) continue
          for (let dy = 0; dy < strokeW; dy++) {
            for (let dx = 0; dx < strokeW; dx++) {
              px(x0 + c * strokeW + dx, y0 + r * strokeW + dy, 30)
            }
          }
        }
      }
      if (y0 + gh > CHART.textY + CHART.textH) break
    }
  }

  // realistic sensor noise, applied last so it affects every feature equally
  if (noiseSigma > 0) {
    let nseed = 777
    const nrnd = () => { nseed = (nseed * 1103515245 + 12345) % 2147483648; return nseed / 2147483648 }
    for (let i = 0; i < data.length; i++) {
      const g = (nrnd() + nrnd() + nrnd() + nrnd() - 2) * noiseSigma   // ~gaussian
      data[i] = Math.max(0, Math.min(255, Math.round(data[i] + g)))
    }
  }

  return sharp(data, { raw: { width, height, channels: 1 } }).png().toBuffer()
}

// ---------------------------------------------------------------- degradations
export async function degrade(buffer, kind) {
  const img = sharp(buffer)
  const { width, height } = await img.metadata()
  switch (kind) {
    case 'clean':
      return buffer
    case 'lowlight': {
      // underexposure + sensor noise, as a dim garage/underbody shot
      const dim = await sharp(buffer).linear(0.35, 0).raw().toBuffer()
      let seed = 999
      const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 }
      for (let i = 0; i < dim.length; i++) {
        const n = (rnd() + rnd() + rnd() + rnd() - 2) * 9    // high-ISO shot noise
        dim[i] = Math.max(0, Math.min(255, dim[i] + n))
      }
      return sharp(dim, { raw: { width, height, channels: 1 } }).png().toBuffer()
    }
    case 'glare': {
      // specular highlight from a flash/sun reflection on painted metal
      const raw = await sharp(buffer).raw().toBuffer()
      const cx = width * 0.42, cy = height * 0.32, r = Math.min(width, height) * 0.30
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const d = Math.hypot(x - cx, y - cy)
          if (d < r) {
            const f = (1 - d / r) ** 1.6
            const i = y * width + x
            raw[i] = Math.min(255, raw[i] + 255 * f)
          }
        }
      }
      return sharp(raw, { raw: { width, height, channels: 1 } }).png().toBuffer()
    }
    case 'blur':
      // handheld motion blur
      return sharp(buffer).blur(6).png().toBuffer()
    default:
      throw new Error(`unknown degradation ${kind}`)
  }
}

// ---------------------------------------------------------------- metrics
export async function toGray(buffer) {
  const img = sharp(buffer).greyscale()
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
  return { data, width: info.width, height: info.height }
}

/** Variance of the Laplacian — the standard cheap sharpness / blur metric. */
export function laplacianVariance({ data, width, height }) {
  const vals = []
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x
      vals.push(-4 * data[i] + data[i - 1] + data[i + 1] + data[i - width] + data[i + width])
    }
  }
  const m = vals.reduce((s, v) => s + v, 0) / vals.length
  return vals.reduce((s, v) => s + (v - m) ** 2, 0) / vals.length
}

export function basicStats({ data }) {
  let sum = 0, clipHi = 0, clipLo = 0
  const hist = new Array(256).fill(0)
  for (let i = 0; i < data.length; i++) {
    sum += data[i]
    hist[data[i]]++
    if (data[i] >= 250) clipHi++
    if (data[i] <= 5) clipLo++
  }
  const meanV = sum / data.length
  let varSum = 0
  for (let i = 0; i < data.length; i++) varSum += (data[i] - meanV) ** 2
  let entropy = 0
  for (const h of hist) { if (h > 0) { const p = h / data.length; entropy -= p * Math.log2(p) } }
  return {
    meanLuma: +meanV.toFixed(2),
    rmsContrast: +Math.sqrt(varSum / data.length).toFixed(2),
    clippedHighlightPct: +((clipHi / data.length) * 100).toFixed(3),
    clippedShadowPct: +((clipLo / data.length) * 100).toFixed(3),
    entropyBits: +entropy.toFixed(3),
  }
}

/** Global SSIM on 8x8 blocks (grayscale, both images resized to a common size). */
export function ssim(a, b) {
  if (a.width !== b.width || a.height !== b.height) throw new Error('SSIM size mismatch')
  const C1 = (0.01 * 255) ** 2, C2 = (0.03 * 255) ** 2
  const B = 8
  let total = 0, count = 0
  for (let by = 0; by + B <= a.height; by += B) {
    for (let bx = 0; bx + B <= a.width; bx += B) {
      let ma = 0, mb = 0
      for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) {
        ma += a.data[(by + y) * a.width + bx + x]
        mb += b.data[(by + y) * b.width + bx + x]
      }
      ma /= B * B; mb /= B * B
      let va = 0, vb = 0, cov = 0
      for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) {
        const da = a.data[(by + y) * a.width + bx + x] - ma
        const db = b.data[(by + y) * b.width + bx + x] - mb
        va += da * da; vb += db * db; cov += da * db
      }
      va /= B * B - 1; vb /= B * B - 1; cov /= B * B - 1
      total += ((2 * ma * mb + C1) * (2 * cov + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2))
      count++
    }
  }
  return count ? total / count : 0
}

export function psnr(a, b) {
  if (a.width !== b.width || a.height !== b.height) throw new Error('PSNR size mismatch')
  let mse = 0
  for (let i = 0; i < a.data.length; i++) mse += (a.data[i] - b.data[i]) ** 2
  mse /= a.data.length
  return mse === 0 ? Infinity : 10 * Math.log10((255 ** 2) / mse)
}

/**
 * Visibility of one chart feature in a DELIVERED image, at that image's own
 * resolution: structure inside the feature's region relative to a flat control
 * region. 1.0 means the feature adds nothing above the plain-panel texture.
 */
export function featureVisibility(gray, region, control, chartWidth) {
  const scale = gray.width / chartWidth
  const crop = (r) => {
    const x0 = Math.max(0, Math.floor(r.x * scale))
    const y0 = Math.max(0, Math.floor(r.y * scale))
    const w = Math.max(1, Math.floor(r.w * scale))
    const h = Math.max(1, Math.floor(r.h * scale))
    const vals = []
    for (let y = y0; y < Math.min(gray.height, y0 + h); y++) {
      for (let x = x0; x < Math.min(gray.width, x0 + w); x++) vals.push(gray.data[y * gray.width + x])
    }
    const m = vals.reduce((s, v) => s + v, 0) / (vals.length || 1)
    const sd = Math.sqrt(vals.reduce((s, v) => s + (v - m) ** 2, 0) / (vals.length || 1))
    return { mean: m, sd }
  }
  const f = crop(region)
  const c = crop(control)
  return +(f.sd / Math.max(c.sd, 0.25)).toFixed(3)
}

// ------------------------------------------------- detection-theoretic metrics
const sampleRect = (gray, r, scale) => {
  const x0 = Math.max(0, Math.round(r.x * scale)), y0 = Math.max(0, Math.round(r.y * scale))
  const x1 = Math.min(gray.width, Math.round((r.x + r.w) * scale))
  const y1 = Math.min(gray.height, Math.round((r.y + r.h) * scale))
  const vals = []
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) vals.push(gray.data[y * gray.width + x])
  return vals
}
const avg = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0)
const sd = (a) => { const m = avg(a); return Math.sqrt(avg(a.map((v) => (v - m) ** 2))) }
const pctl = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.round((p / 100) * (s.length - 1))))] ?? 0 }

/**
 * Contrast-to-noise ratio: how many background-noise sigmas the feature's mean
 * level sits away from its immediate surroundings. This is the quantity that
 * decides whether a defect is detectable at all; unlike a plain "structure vs
 * flat area" ratio it cannot be inflated by JPEG/sensor noise, because noise
 * raises the denominator too.
 */
export function cnr(gray, featureRect, bgRects, chartWidth) {
  const scale = gray.width / chartWidth
  const f = sampleRect(gray, featureRect, scale)
  const bg = bgRects.flatMap((r) => sampleRect(gray, r, scale))
  if (!f.length || !bg.length) return 0
  const noise = sd(bg)
  return +(Math.abs(avg(f) - avg(bg)) / Math.max(noise, 0.5)).toFixed(3)
}

/** Michelson contrast from robust percentiles — for textured/periodic regions. */
export function michelson(gray, rect, chartWidth) {
  const vals = sampleRect(gray, rect, gray.width / chartWidth)
  if (!vals.length) return 0
  const hi = pctl(vals, 95), lo = pctl(vals, 5)
  return +((hi - lo) / Math.max(hi + lo, 1)).toFixed(4)
}

/**
 * Line-profile CNR — robust to sub-pixel alignment.
 *
 * Averages a horizontal intensity profile over the line's vertical extent,
 * takes the baseline and its noise from the flanking background columns, and
 * reports the line's peak deviation in units of that noise. Unlike a rectangle
 * sampler it cannot collapse to zero when a thin line lands between two
 * destination pixels. Averaging along the line is a matched-filter assumption:
 * a line-shaped defect is integrated along its length, which is also how a
 * human or a vision model reads it.
 */
export function lineProfileCnr(gray, cell, chartWidth) {
  const s = gray.width / chartWidth
  const xLine = cell.lineX * s
  const yTop = Math.max(0, Math.round(cell.lineY * s))
  const yBot = Math.min(gray.height, Math.round((cell.lineY + cell.lineH) * s))
  const xFrom = Math.max(0, Math.round((cell.lineX - cell.halfSpan) * s))
  const xTo = Math.min(gray.width, Math.round((cell.lineX + cell.halfSpan) * s))
  if (yBot - yTop < 2 || xTo - xFrom < 5) return 0

  const profile = []
  for (let x = xFrom; x < xTo; x++) {
    let sum = 0, n = 0
    for (let y = yTop; y < yBot; y++) { sum += gray.data[y * gray.width + x]; n++ }
    profile.push({ x, v: sum / n })
  }
  // background = columns at least `guard` capture-pixels away from the line
  const guard = (cell.width + 6) * s
  const bg = profile.filter((p) => Math.abs(p.x - xLine) > guard).map((p) => p.v)
  if (bg.length < 5) return 0
  const bm = bg.reduce((a, b) => a + b, 0) / bg.length
  const bsd = Math.sqrt(bg.reduce((a, b) => a + (b - bm) ** 2, 0) / bg.length)
  const core = profile.filter((p) => Math.abs(p.x - xLine) <= Math.max(1.5, (cell.width * s) / 2 + 1))
  if (!core.length) return 0
  const peak = Math.max(...core.map((p) => Math.abs(p.v - bm)))
  return +(peak / Math.max(bsd, 0.05)).toFixed(2)
}
