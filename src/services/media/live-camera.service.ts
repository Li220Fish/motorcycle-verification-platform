/**
 * In-app live camera preview for still-photo capture (no recording) —
 * powers MultiPhotoEvidenceCapture.vue's full-screen camera-app-style
 * viewfinder. Same getUserMedia mechanism already proven by
 * video-recorder.service.ts (Step 3/39's in-app video capture); this is
 * simpler since it never needs a MediaRecorder — individual frames are
 * grabbed via canvas from the live `<video>` element instead.
 */
/** `torch` isn't part of the standard MediaTrackCapabilities/Constraints
 *  typings (lib.dom.d.ts) even though most Android Chrome builds support it
 *  in practice — callers cast through this instead of sprinkling `as any`. */
export type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean }
export type TorchConstraintSet = MediaTrackConstraintSet & { torch?: boolean }

export type CameraFacing = 'user' | 'environment'

class LiveCameraService {
  private stream: MediaStream | null = null

  /** `facingMode` defaults to the back/environment camera — every core
   *  photo except 引擎底部 (APR-engine-bottom) uses it. That one item wants
   *  the FRONT camera instead (CorePhotoCaptureFlow.vue's FRONT_CAMERA_ITEM_ID),
   *  so switching to/from it requires actually restarting the stream —
   *  there's no way to change a live getUserMedia track's physical camera
   *  without stopping and reacquiring. */
  async start(facingMode: CameraFacing = 'environment'): Promise<MediaStream> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('此裝置或瀏覽器不支援相機預覽')
    }
    this.stop()
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode },
      audio: false,
    })
    return this.stream
  }

  getVideoTrack(): MediaStreamTrack | null {
    return this.stream?.getVideoTracks()[0] ?? null
  }

  stop(): void {
    for (const track of this.stream?.getTracks() ?? []) track.stop()
    this.stream = null
  }
}

export const liveCameraService = new LiveCameraService()
