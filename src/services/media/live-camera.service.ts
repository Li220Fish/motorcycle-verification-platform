/**
 * In-app live camera preview for still-photo capture (no recording) —
 * powers MultiPhotoEvidenceCapture.vue's full-screen camera-app-style
 * viewfinder. Same getUserMedia mechanism already proven by
 * video-recorder.service.ts (Step 3/39's in-app video capture); this is
 * simpler since it never needs a MediaRecorder — individual frames are
 * grabbed via canvas from the live `<video>` element instead.
 */
import { Torch } from '@capawesome/capacitor-torch'

import { platformService } from '@/services/platform/platform.service'

/** `torch` isn't part of the standard MediaTrackCapabilities/Constraints
 *  typings (lib.dom.d.ts) even though most Android Chrome builds support it
 *  in practice — callers cast through this instead of sprinkling `as any`. */
export type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean }
export type TorchConstraintSet = MediaTrackConstraintSet & { torch?: boolean }

export type CameraFacing = 'user' | 'environment'

/** Asked of getUserMedia so a captured frame has enough pixels to survive the
 *  rest of the pipeline. Deliberately above MAX_LONG_EDGE (1600): the frame is
 *  downscaled to that afterwards anyway, and asking for exactly 1600 leaves no
 *  headroom if a device rounds down to its nearest supported mode. */
const PREFERRED_CAPTURE_LONG_EDGE = 1920
const PREFERRED_CAPTURE_SHORT_EDGE = 1440

class LiveCameraService {
  private stream: MediaStream | null = null
  private facingMode: CameraFacing = 'environment'

  /** `facingMode` defaults to the back/environment camera — every core
   *  photo except 引擎底部 (APR-engine-bottom) uses it. That one item wants
   *  the FRONT camera instead (CorePhotoCaptureFlow.vue's FRONT_CAMERA_ITEM_ID),
   *  so switching to/from it requires actually restarting the stream —
   *  there's no way to change a live getUserMedia track's physical camera
   *  without stopping and reacquiring.
   *
   * The resolution constraints are NOT cosmetic. Without them the browser
   * picks its own default, and a real verification's stored Core Vision
   * evidence came out at 480x640 — a quarter of the long edge
   * `imageUpload.config.ts` intends (MAX_LONG_EDGE 1600), and 6.25x fewer
   * pixels. The capture path cannot recover from that later either:
   * image-compression.service.ts only ever scales DOWN, so a small frame
   * stays small all the way to Gemini. `ideal` rather than `exact` on
   * purpose — a device that cannot deliver this must still hand back its best
   * effort rather than failing the whole getUserMedia call; callers check
   * `getAchievedResolution()` for what actually arrived.
   */
  async start(facingMode: CameraFacing = 'environment'): Promise<MediaStream> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('此裝置或瀏覽器不支援相機預覽')
    }
    this.stop()
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode,
        width: { ideal: PREFERRED_CAPTURE_LONG_EDGE },
        height: { ideal: PREFERRED_CAPTURE_SHORT_EDGE },
      },
      audio: false,
    })
    this.facingMode = facingMode
    return this.stream
  }

  /**
   * What the active track actually delivers, which is not necessarily what
   * `start()` asked for — constraint satisfaction is best-effort and varies by
   * device, OS and WebView build. Capture code records this alongside the
   * evidence so a too-small frame is visible in the data rather than only
   * discoverable by downloading a stored photo and checking its dimensions.
   */
  getAchievedResolution(): { width: number; height: number } | null {
    const settings = this.getVideoTrack()?.getSettings()
    if (!settings?.width || !settings?.height) return null
    return { width: settings.width, height: settings.height }
  }

  getVideoTrack(): MediaStreamTrack | null {
    return this.stream?.getVideoTracks()[0] ?? null
  }

  stop(): void {
    for (const track of this.stream?.getTracks() ?? []) track.stop()
    this.stream = null
    // Native torch control (below) is independent of the getUserMedia track
    // above, so stopping the track alone doesn't turn it off — this is a
    // no-op if the torch was never on.
    if (this.nativeTorchUsable()) void Torch.disable().catch(() => {})
  }

  /** Native torch always addresses the BACK camera's physical flash (see
   * isTorchSupported()'s doc comment) — meaningless, and actively confusing,
   * while previewing the FRONT camera (APR-engine-bottom), so it's only
   * attempted when the active preview is the back/environment camera. */
  private nativeTorchUsable(): boolean {
    return platformService.isNative() && this.facingMode === 'environment'
  }

  /**
   * Whether the flashlight can be toggled. Tries native Android/iOS torch
   * control first — it addresses the physical camera's flash unit directly
   * via the OS (Camera2 on Android), independent of which lens the
   * getUserMedia preview track above is actually showing. This matters
   * because on some phones (reported on a Samsung Galaxy S22) the preview
   * track's own `getCapabilities().torch` never reports true at all — either
   * the browser picked a lens with no physical flash for `facingMode:
   * environment`, or that Android WebView/Chromium build just doesn't
   * expose the capability, both long-standing, device-specific
   * inconsistencies in the (non-standard) web torch API, not something a
   * web-only fix can reliably paper over. Falls back to the web
   * MediaStreamTrack capability check when native isn't available (web dev
   * builds) or the native check itself fails.
   *
   * Known limitation (confirmed live on a real device): when the native
   * torch call's physical camera is the SAME one the getUserMedia preview
   * above already holds open, Android rejects it with CAMERA_IN_USE — this
   * is a hard OS-level constraint (a separate client can't grab torch
   * control on a camera another client is actively streaming from), not
   * something retryable. setTorch() below falls back to the web approach in
   * that case, same as when native is simply unavailable — this can only
   * ever match or improve on the pre-native behavior, never regress it, but
   * doesn't guarantee a fix on every device (a device where the CONFLICT
   * itself is what's failing, rather than the web capability check, will
   * still fall through to the same web path that didn't work there before).
   * A prior attempt to fully avoid this by moving the whole live preview to
   * a native camera-preview plugin (single shared session, no conflict by
   * construction) was reverted — it broke the visible preview itself on a
   * real test device (a worse regression, for everyone, than the flash bug
   * it was meant to fix) and wasn't worth pursuing further given the
   * unresolved rendering cost. If the flash issue resurfaces on a specific
   * device, revisit that approach with a plan for the WebView-transparency/
   * SurfaceView rendering problem it hit.
   */
  async isTorchSupported(): Promise<boolean> {
    if (this.nativeTorchUsable()) {
      try {
        const { available } = await Torch.isAvailable()
        if (available) return true
      } catch (error) {
        console.error('[LiveCameraService] native Torch.isAvailable failed:', error)
      }
    }
    const capabilities = this.getVideoTrack()?.getCapabilities?.() as TorchCapabilities | undefined
    return !!capabilities?.torch
  }

  /** Same native-first, web-fallback reasoning as isTorchSupported() —
   * falls back if the native call throws (e.g. CAMERA_IN_USE, see above). */
  async setTorch(on: boolean): Promise<void> {
    if (this.nativeTorchUsable()) {
      try {
        if (on) await Torch.enable()
        else await Torch.disable()
        return
      } catch (error) {
        console.error(
          '[LiveCameraService] native Torch toggle failed, falling back to web API:',
          error,
        )
      }
    }
    const track = this.getVideoTrack()
    if (!track) throw new Error('沒有可用的相機串流')
    const constraint: TorchConstraintSet = { torch: on }
    await track.applyConstraints({ advanced: [constraint] })
  }
}

export const liveCameraService = new LiveCameraService()
