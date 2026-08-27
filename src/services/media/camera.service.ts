import { Camera } from '@capacitor/camera'
import type { MediaResult } from '@capacitor/camera'

import { platformService } from '@/services/platform/platform.service'

async function takePhoto(): Promise<MediaResult> {
  return Camera.takePhoto({ quality: 85, saveToGallery: false })
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
