/**
 * Live rear-camera stream for the guided viewfinder, plus the 3:4 crop that
 * both the on-screen preview (object-fit: cover, centered) and the stored
 * photo use — so guide coordinates mean the same thing in both.
 *
 * Separate from the main app's live-camera.service.ts on purpose: that one
 * asks for whatever resolution the browser defaults to, while training data
 * wants the highest 4:3 mode the device offers.
 */
import type { TorchCapabilities, TorchConstraintSet } from '@/services/media/live-camera.service'
import { TRAINING_FRAME_ASPECT } from '@/data/training/training-shots'

export type CameraFacing = 'environment' | 'user'

let stream: MediaStream | null = null

export async function startCamera(facing: CameraFacing): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('此瀏覽器不支援相機（需使用 HTTPS 開啟）')
  }
  stopCamera()
  stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: facing },
      // 4:3 sensor mode → portrait 3:4 with no crop on most phones.
      width: { ideal: 2560 },
      height: { ideal: 1920 },
      aspectRatio: { ideal: 4 / 3 },
    },
  })
  return stream
}

export function stopCamera(): void {
  for (const track of stream?.getTracks() ?? []) track.stop()
  stream = null
}

function videoTrack(): MediaStreamTrack | null {
  return stream?.getVideoTracks()[0] ?? null
}

export function torchSupported(): boolean {
  const caps = videoTrack()?.getCapabilities?.() as TorchCapabilities | undefined
  return !!caps?.torch
}

export async function setTorch(on: boolean): Promise<void> {
  const track = videoTrack()
  if (!track) return
  const constraint: TorchConstraintSet = { torch: on }
  await track.applyConstraints({ advanced: [constraint] })
}

export interface CropRect {
  sx: number
  sy: number
  sw: number
  sh: number
}

/** Centered 3:4 crop of a `srcW × srcH` frame — identical to what
 *  `object-fit: cover` shows inside a 3:4 box. */
export function frameCrop(srcW: number, srcH: number): CropRect {
  const srcAspect = srcW / srcH
  if (srcAspect > TRAINING_FRAME_ASPECT) {
    const sw = Math.round(srcH * TRAINING_FRAME_ASPECT)
    return { sx: Math.round((srcW - sw) / 2), sy: 0, sw, sh: srcH }
  }
  const sh = Math.round(srcW / TRAINING_FRAME_ASPECT)
  return { sx: 0, sy: Math.round((srcH - sh) / 2), sw: srcW, sh }
}

export interface GrabbedFrame {
  blob: Blob
  width: number
  height: number
}

/** Full-resolution 3:4 still from the live <video>. */
export async function grabFrame(video: HTMLVideoElement): Promise<GrabbedFrame> {
  const crop = frameCrop(video.videoWidth, video.videoHeight)
  const canvas = document.createElement('canvas')
  canvas.width = crop.sw
  canvas.height = crop.sh
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('無法建立畫布')
  ctx.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, crop.sw, crop.sh)
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.92),
  )
  if (!blob) throw new Error('影像擷取失敗')
  return { blob, width: crop.sw, height: crop.sh }
}
