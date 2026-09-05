import sharp from 'sharp'

/** Deterministic per-frame image quality metrics (Environment spec §8) —
 *  computed once per extracted frame, then averaged across all frames for
 *  the whole session. No Gemini call involved; these are the numeric
 *  "capture suitability" context that goes alongside (not instead of)
 *  Gemini's own semantic read of the same frames. */
export interface VisualMetrics {
  meanBrightness: number
  underexposureRatio: number
  overexposureRatio: number
  brightnessVariance: number
  blurScore: number
}

const UNDEREXPOSED_THRESHOLD = 40 // 0-255 luma
const OVEREXPOSED_THRESHOLD = 235

/** Classic "variance of Laplacian" blur metric — low variance after an
 *  edge-detection convolution means few sharp edges, i.e. a blurry frame.
 *  No ML/CV library needed: sharp's own `.convolve()` kernel does the
 *  Laplacian pass, `.stats()` gives the resulting variance directly. */
async function computeFrameMetrics(frame: Buffer): Promise<VisualMetrics> {
  const gray = sharp(frame).greyscale()
  const { data, info } = await gray.raw().toBuffer({ resolveWithObject: true })
  const pixelCount = info.width * info.height

  let sum = 0
  let underexposed = 0
  let overexposed = 0
  for (let i = 0; i < pixelCount; i++) {
    const luma = data[i]
    sum += luma
    if (luma < UNDEREXPOSED_THRESHOLD) underexposed++
    if (luma > OVEREXPOSED_THRESHOLD) overexposed++
  }
  const mean = sum / pixelCount
  let variance = 0
  for (let i = 0; i < pixelCount; i++) variance += (data[i] - mean) ** 2
  variance /= pixelCount

  const laplacian = await sharp(frame)
    .greyscale()
    .convolve({ width: 3, height: 3, kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0] })
    .raw()
    .toBuffer()
  let lapSum = 0
  for (const value of laplacian) lapSum += value
  const lapMean = lapSum / laplacian.length
  let lapVariance = 0
  for (const value of laplacian) lapVariance += (value - lapMean) ** 2
  lapVariance /= laplacian.length

  return {
    meanBrightness: Number(mean.toFixed(2)),
    underexposureRatio: Number((underexposed / pixelCount).toFixed(4)),
    overexposureRatio: Number((overexposed / pixelCount).toFixed(4)),
    brightnessVariance: Number(variance.toFixed(2)),
    blurScore: Number(lapVariance.toFixed(2)),
  }
}

function mean(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

export async function computeVisualMetrics(frames: Buffer[]): Promise<VisualMetrics> {
  const perFrame = await Promise.all(frames.map(computeFrameMetrics))
  return {
    meanBrightness: Number(mean(perFrame.map((f) => f.meanBrightness)).toFixed(2)),
    underexposureRatio: Number(mean(perFrame.map((f) => f.underexposureRatio)).toFixed(4)),
    overexposureRatio: Number(mean(perFrame.map((f) => f.overexposureRatio)).toFixed(4)),
    brightnessVariance: Number(mean(perFrame.map((f) => f.brightnessVariance)).toFixed(2)),
    blurScore: Number(mean(perFrame.map((f) => f.blurScore)).toFixed(2)),
  }
}
