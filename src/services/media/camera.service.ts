import { Camera } from '@capacitor/camera'
import type { MediaResult } from '@capacitor/camera'

import { MAX_LONG_EDGE } from '@/config/imageUpload.config'
import { platformService } from '@/services/platform/platform.service'

/**
 * `width`/`height` bound the native camera result to roughly MAX_LONG_EDGE on
 * its long side before it ever reaches the WebView — avoids decoding a full
 * 12MP+ original just to immediately downscale it again in
 * image-compression.service.ts, which still runs afterward to guarantee a
 * consistent final size/quality/orientation regardless of device/platform.
 */
async function takePhoto(): Promise<MediaResult> {
  return Camera.takePhoto({
    quality: 85,
    saveToGallery: false,
    targetWidth: MAX_LONG_EDGE,
    targetHeight: MAX_LONG_EDGE,
    correctOrientation: true,
  })
}

/** Native only — `@capacitor/camera` does not support video capture on Web. */
async function recordVideo(): Promise<MediaResult> {
  if (!platformService.isNative()) {
    throw new Error(
      'Native video capture is only available in the Android/iOS app, not the browser.',
    )
  }
  return Camera.recordVideo({ saveToGallery: false })
}

export const cameraService = { takePhoto, recordVideo }
