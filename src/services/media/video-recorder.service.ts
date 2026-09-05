/**
 * In-app timed video+audio capture — Step 3 (Environment Calibration) and
 * Step 39 (Cold-state 5-second contact check) both need frame-accurate,
 * app-driven timing (a fixed 3s→5s→1s schedule for Step 39; a live preview
 * + app-controlled stop for Step 3), which this project's existing video
 * mechanism can't provide: `camera.service.ts`'s `Camera.recordVideo()`
 * hands off to the OS's own opaque camera UI/timing, and the web fallback
 * everywhere else is a bare `<input type="file" capture>` picker — neither
 * gives any in-app control once invoked. This is a new capability this
 * pass, built on the standard `getUserMedia`/`MediaRecorder` Web APIs
 * (already relied on elsewhere via `DeviceMotionEvent`), which Capacitor's
 * WebView exposes the same as a browser.
 */
export interface VideoRecordingResult {
  blob: Blob
  durationMs: number
  mimeType: string
}

const CANDIDATE_MIME_TYPES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4',
]

function pickMimeType(): string {
  for (const candidate of CANDIDATE_MIME_TYPES) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(candidate)) {
      return candidate
    }
  }
  return ''
}

class VideoRecorderService {
  private stream: MediaStream | null = null
  private recorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private startedAt = 0
  private mimeType = ''

  /** Requests camera+mic and starts recording immediately — returns the
   *  live MediaStream so the caller can bind it to a `<video>` preview
   *  element (`el.srcObject = stream`).
   *
   *  Releases the camera/mic stream on ANY failure, including one that
   *  happens after getUserMedia() itself succeeds (MediaRecorder
   *  construction/start throwing on some WebView builds) — without this, a
   *  failed attempt leaves the hardware locked by the leaked stream, and the
   *  NEXT start() call (e.g. navigating on to Step 39) then hangs forever
   *  waiting on a camera the OS considers still in use, rather than erroring
   *  cleanly. This was reproduced on a real device as "environment capture
   *  silently reverts to the start button, then cold-touch capture never
   *  gets past 準備中". Also proactively releases any stream a previous
   *  call left behind, in case a caller's own catch path didn't call
   *  cancel() (defense in depth, not a substitute for the caller doing so). */
  async start(): Promise<MediaStream> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('此裝置或瀏覽器不支援錄影')
    }
    this.releaseStream()

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: true,
    })
    try {
      this.mimeType = pickMimeType()
      this.chunks = []
      const recorder = new MediaRecorder(stream, this.mimeType ? { mimeType: this.mimeType } : undefined)
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) this.chunks.push(event.data)
      }
      this.stream = stream
      this.recorder = recorder
      this.startedAt = Date.now()
      recorder.start()
      return stream
    } catch (error) {
      for (const track of stream.getTracks()) track.stop()
      throw error
    }
  }

  private releaseStream(): void {
    this.recorder?.stop()
    for (const track of this.stream?.getTracks() ?? []) track.stop()
    this.recorder = null
    this.stream = null
    this.chunks = []
  }

  async stop(): Promise<VideoRecordingResult> {
    const recorder = this.recorder
    const stream = this.stream
    if (!recorder || !stream) throw new Error('尚未開始錄影')

    const durationMs = Date.now() - this.startedAt
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve()
      recorder.stop()
    })
    for (const track of stream.getTracks()) track.stop()

    this.recorder = null
    this.stream = null
    const blob = new Blob(this.chunks, { type: this.mimeType || 'video/webm' })
    this.chunks = []
    return { blob, durationMs, mimeType: this.mimeType || 'video/webm' }
  }

  /** Cancels without producing a usable result — used when the user backs
   *  out mid-recording (Step 3's own cancel path). */
  cancel(): void {
    this.releaseStream()
  }
}

export const videoRecorderService = new VideoRecorderService()
