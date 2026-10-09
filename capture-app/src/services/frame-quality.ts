/**
 * Live framing checks shown over the viewfinder (and stored with every photo
 * so the admin side can filter on them). Advisory only — the shutter is
 * never blocked, since a "too dark" garage shot of a rare model is still
 * better than none.
 *
 * Thresholds are first guesses, NOT calibrated: every capture stores the raw
 * brightness/sharpness numbers, so once a few hundred photos have been
 * approved/rejected in the admin tool these can be re-fit from real data.
 */
import type { NormalizedBox } from '@/data/training/training-dataset.types'
import { frameCrop } from './camera'

export const BRIGHTNESS_MIN = 55
export const BRIGHTNESS_MAX = 215
export const SHARPNESS_MIN = 40

/** Analysis canvas size (3:4) — big enough that motion blur still registers
 *  in the Laplacian, small enough to run several times a second. */
const W = 240
const H = 320

const canvas = document.createElement('canvas')
canvas.width = W
canvas.height = H
const ctx = canvas.getContext('2d', { willReadFrequently: true })

export interface FrameMetrics {
  brightness: number
  sharpness: number
}

export function measureFrame(video: HTMLVideoElement, region: NormalizedBox): FrameMetrics | null {
  if (!ctx || !video.videoWidth) return null
  const crop = frameCrop(video.videoWidth, video.videoHeight)
  ctx.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, W, H)
  const { data } = ctx.getImageData(0, 0, W, H)

  const gray = new Float32Array(W * H)
  let sum = 0
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    const v = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]
    gray[i] = v
    sum += v
  }

  // Laplacian variance inside the subject's guide box only — a sharp
  // background behind a blurry fork leg should still read as blurry.
  const x0 = Math.max(1, Math.floor(region.x * W))
  const y0 = Math.max(1, Math.floor(region.y * H))
  const x1 = Math.min(W - 1, Math.ceil((region.x + region.w) * W))
  const y1 = Math.min(H - 1, Math.ceil((region.y + region.h) * H))
  let n = 0
  let lapSum = 0
  let lapSq = 0
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = y * W + x
      const lap = gray[i - W] + gray[i + W] + gray[i - 1] + gray[i + 1] - 4 * gray[i]
      lapSum += lap
      lapSq += lap * lap
      n++
    }
  }
  const mean = n ? lapSum / n : 0
  const sharpness = n ? lapSq / n - mean * mean : 0

  return { brightness: sum / gray.length, sharpness }
}

export function frameWarnings(m: FrameMetrics | null, rollDeg: number | null): string[] {
  const warnings: string[] = []
  if (m) {
    if (m.brightness < BRIGHTNESS_MIN) warnings.push('太暗')
    if (m.brightness > BRIGHTNESS_MAX) warnings.push('過亮')
    if (m.sharpness < SHARPNESS_MIN) warnings.push('對焦模糊')
  }
  if (rollDeg !== null && Math.abs(rollDeg) > 6) warnings.push('手機歪斜')
  return warnings
}
