import { IMAGE_QUALITY, MAX_LONG_EDGE } from '@/config/imageUpload.config'

export interface CompressedImage {
  blob: Blob
  width: number
  height: number
}

/**
 * Resizes+re-encodes a captured photo to at most MAX_LONG_EDGE on its longest
 * side at IMAGE_QUALITY, correcting EXIF orientation in the process.
 *
 * Uses only browser-native APIs (createImageBitmap + canvas) — no third-party
 * compression library. `imageOrientation: 'from-image'` makes the decode step
 * itself apply the photo's EXIF orientation, so the resulting bitmap (and
 * therefore the output JPEG) is already right-side-up with no separate EXIF
 * handling needed. Both calls are supported in Capacitor's Android WebView
 * (Chrome) and iOS WKWebView on any currently-supported OS version.
 *
 * `createImageBitmap`'s decode runs off the main thread already; canvas
 * `toBlob` encoding is likewise handled asynchronously by the browser in the
 * engines Capacitor ships (Blink/WebKit) — this does not need a dedicated
 * Web Worker to avoid blocking the UI thread.
 */
async function compressImage(
  source: Blob,
  options: { maxLongEdge?: number; quality?: number } = {},
): Promise<CompressedImage> {
  const maxLongEdge = options.maxLongEdge ?? MAX_LONG_EDGE
  const quality = options.quality ?? IMAGE_QUALITY

  const bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' })
  try {
    const scale = Math.min(1, maxLongEdge / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable')
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality)
    })
    if (!blob) throw new Error('Image compression failed to produce a blob')

    return { blob, width, height }
  } finally {
    bitmap.close()
  }
}

export const imageCompressionService = { compressImage }
