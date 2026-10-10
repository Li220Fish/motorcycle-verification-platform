import {
  DARK_PIXEL_LEVEL,
  MAX_CLIPPED_HIGHLIGHT_PCT,
  MAX_DARK_PIXEL_PCT,
  MIN_BEST_TILE_SHARPNESS,
  MIN_CAPTURE_LONG_EDGE,
  MIN_MEAN_LUMA,
  MIN_MEDIAN_TILE_SHARPNESS,
  QUALITY_ANALYSIS_LONG_EDGE,
  QUALITY_TILE_GRID,
  WARN_MEDIAN_TILE_SHARPNESS,
} from '@/config/photoQuality.config'

export type PhotoQualityLevel = 'ok' | 'warn' | 'reject'

export type PhotoQualityIssue =
  'out_of_focus' | 'low_detail' | 'underexposed' | 'too_dark' | 'glare'

export interface PhotoQualityMetrics {
  capturedWidth: number
  capturedHeight: number
  bestTileSharpness: number
  medianTileSharpness: number
  meanLuma: number
  clippedHighlightPct: number
  darkPixelPct: number
}

export interface PhotoQualityReport {
  level: PhotoQualityLevel
  issues: PhotoQualityIssue[]
  /** One short line for the capture UI, or '' when the photo is fine. */
  message: string
  metrics: PhotoQualityMetrics
}

const ISSUE_TEXT: Record<PhotoQualityIssue, string> = {
  out_of_focus: '整張照片都沒對到焦',
  low_detail: '畫面細節不足，可能失焦或晃到',
  underexposed: '光線不足，畫面偏暗',
  too_dark: '畫面大部分過暗，看不出細節',
  glare: '反光過強，部分畫面過曝',
}

function median(values: number[]): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** Variance of the Laplacian over one tile — the standard cheap focus measure. */
function laplacianVariance(
  luma: Float32Array,
  width: number,
  x0: number,
  y0: number,
  tileW: number,
  tileH: number,
): number {
  const values: number[] = []
  for (let y = y0 + 1; y < y0 + tileH - 1; y++) {
    for (let x = x0 + 1; x < x0 + tileW - 1; x++) {
      const i = y * width + x
      values.push(-4 * luma[i] + luma[i - 1] + luma[i + 1] + luma[i - width] + luma[i + width])
    }
  }
  if (values.length < 2) return 0
  let sum = 0
  for (const v of values) sum += v
  const mean = sum / values.length
  let variance = 0
  for (const v of values) variance += (v - mean) ** 2
  return variance / values.length
}

/**
 * Downscales to a fixed analysis size and returns a single-channel luma plane.
 * Fixing the analysis resolution is what makes the thresholds in
 * photoQuality.config.ts comparable across devices — Laplacian variance is
 * meaningless to compare between a 640px and a 4032px frame.
 */
async function toAnalysisLuma(source: Blob): Promise<{
  luma: Float32Array
  width: number
  height: number
  sourceWidth: number
  sourceHeight: number
}> {
  const bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' })
  try {
    const scale = Math.min(1, QUALITY_ANALYSIS_LONG_EDGE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('Canvas 2D context unavailable')
    ctx.drawImage(bitmap, 0, 0, width, height)
    const { data } = ctx.getImageData(0, 0, width, height)

    const luma = new Float32Array(width * height)
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      luma[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    }
    return { luma, width, height, sourceWidth: bitmap.width, sourceHeight: bitmap.height }
  } finally {
    bitmap.close()
  }
}

/**
 * Scores a just-captured photo so the capture UI can offer a retake before the
 * rider walks away. Never throws on a measurement problem: a gate that blocks
 * capture because it could not analyse something would be worse than no gate,
 * so any failure resolves to `ok` with empty metrics.
 */
async function assess(photo: Blob): Promise<PhotoQualityReport> {
  let analysis: Awaited<ReturnType<typeof toAnalysisLuma>>
  try {
    analysis = await toAnalysisLuma(photo)
  } catch {
    return {
      level: 'ok',
      issues: [],
      message: '',
      metrics: {
        capturedWidth: 0,
        capturedHeight: 0,
        bestTileSharpness: 0,
        medianTileSharpness: 0,
        meanLuma: 0,
        clippedHighlightPct: 0,
        darkPixelPct: 0,
      },
    }
  }

  const { luma, width, height, sourceWidth, sourceHeight } = analysis

  const tileW = Math.floor(width / QUALITY_TILE_GRID)
  const tileH = Math.floor(height / QUALITY_TILE_GRID)
  const tileSharpness: number[] = []
  if (tileW > 2 && tileH > 2) {
    for (let ty = 0; ty < QUALITY_TILE_GRID; ty++) {
      for (let tx = 0; tx < QUALITY_TILE_GRID; tx++) {
        tileSharpness.push(laplacianVariance(luma, width, tx * tileW, ty * tileH, tileW, tileH))
      }
    }
  }

  let lumaSum = 0
  let clipped = 0
  let dark = 0
  for (let i = 0; i < luma.length; i++) {
    lumaSum += luma[i]
    if (luma[i] >= 250) clipped++
    if (luma[i] < DARK_PIXEL_LEVEL) dark++
  }

  const metrics: PhotoQualityMetrics = {
    capturedWidth: sourceWidth,
    capturedHeight: sourceHeight,
    bestTileSharpness: +(tileSharpness.length ? Math.max(...tileSharpness) : 0).toFixed(1),
    medianTileSharpness: +median(tileSharpness).toFixed(1),
    meanLuma: +(lumaSum / luma.length).toFixed(1),
    clippedHighlightPct: +((clipped / luma.length) * 100).toFixed(3),
    darkPixelPct: +((dark / luma.length) * 100).toFixed(2),
  }

  const issues: PhotoQualityIssue[] = []
  let level: PhotoQualityLevel = 'ok'
  const raise = (next: PhotoQualityLevel): void => {
    if (next === 'reject' || (next === 'warn' && level === 'ok')) level = next
  }

  if (metrics.bestTileSharpness < MIN_BEST_TILE_SHARPNESS) {
    issues.push('out_of_focus')
    raise('reject')
  } else if (metrics.medianTileSharpness < MIN_MEDIAN_TILE_SHARPNESS) {
    issues.push('low_detail')
    raise('reject')
  } else if (metrics.medianTileSharpness < WARN_MEDIAN_TILE_SHARPNESS) {
    issues.push('low_detail')
    raise('warn')
  }
  if (metrics.darkPixelPct > MAX_DARK_PIXEL_PCT) {
    issues.push('too_dark')
    raise('reject')
  } else if (metrics.meanLuma < MIN_MEAN_LUMA) {
    issues.push('underexposed')
    raise('warn')
  }
  if (metrics.clippedHighlightPct > MAX_CLIPPED_HIGHLIGHT_PCT) {
    issues.push('glare')
    raise('warn')
  }

  return {
    level,
    issues,
    message: issues.length ? issues.map((issue) => ISSUE_TEXT[issue]).join('、') : '',
    metrics,
  }
}

/**
 * Whether the camera is handing back frames too small to be worth analysing.
 *
 * Deliberately NOT part of `assess()`: resolution is a property of the camera
 * stream, not of any one photo, so flagging it per shot would put the same
 * warning on every single capture of a session. The capture UI checks this
 * once when the stream starts instead. `null` (no resolution reported) is
 * treated as fine — an unknown is not evidence of a problem.
 */
function isCaptureResolutionLow(resolution: { width: number; height: number } | null): boolean {
  if (!resolution) return false
  return Math.max(resolution.width, resolution.height) < MIN_CAPTURE_LONG_EDGE
}

export const photoQualityService = { assess, isCaptureResolutionLow }
