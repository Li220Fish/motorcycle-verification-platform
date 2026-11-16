import { pickMimeType, type RawSample } from '@el/core/session'

type MotionCtor = typeof DeviceMotionEvent & { requestPermission?: () => Promise<'granted' | 'denied'> }

/**
 * Microphone + motion sensors for one 18 s session. Audio processing is
 * switched off so the engine is recorded as-is (same as RiDE's capture).
 */
export class SessionCapture {
  private stream: MediaStream | null = null
  private recorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private motionHandler: ((event: DeviceMotionEvent) => void) | null = null
  readonly motion: RawSample[] = []
  mimeType = ''

  /** Must run inside a tap (iOS motion permission, mic prompt). */
  async prepare(): Promise<{ motion: boolean }> {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      throw new Error('這個瀏覽器不能錄音。請點右上角「⋯」→ 用預設瀏覽器開啟。')
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      })
    } catch {
      throw new Error('需要麥克風權限才能錄引擎聲。請在設定中允許後再試一次。')
    }
    const ctor = (typeof DeviceMotionEvent !== 'undefined' ? DeviceMotionEvent : null) as MotionCtor | null
    let motion = ctor !== null
    if (ctor && typeof ctor.requestPermission === 'function') {
      motion = await ctor.requestPermission().then((state) => state === 'granted').catch(() => false)
    }
    return { motion }
  }

  start(): number {
    if (!this.stream) throw new Error('not prepared')
    this.mimeType = pickMimeType((type) => MediaRecorder.isTypeSupported(type))
    this.recorder = new MediaRecorder(this.stream, this.mimeType ? { mimeType: this.mimeType } : undefined)
    this.chunks = []
    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data)
    }
    this.motion.length = 0
    this.motionHandler = (event) => {
      const a = event.accelerationIncludingGravity
      if (!a) return
      const r = event.rotationRate
      this.motion.push({
        t: Date.now(),
        ax: a.x ?? 0,
        ay: a.y ?? 0,
        az: a.z ?? 0,
        gx: r?.alpha ?? 0,
        gy: r?.beta ?? 0,
        gz: r?.gamma ?? 0,
      })
    }
    window.addEventListener('devicemotion', this.motionHandler)
    this.recorder.start(1000)
    return Date.now()
  }

  stop(): Promise<Blob> {
    this.detachMotion()
    const recorder = this.recorder
    if (!recorder) return Promise.reject(new Error('not recording'))
    return new Promise((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(this.chunks, { type: recorder.mimeType || this.mimeType || 'audio/webm' }))
        this.release()
      }
      recorder.stop()
    })
  }

  release(): void {
    this.detachMotion()
    if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop()
    this.stream?.getTracks().forEach((track) => track.stop())
    this.stream = null
    this.recorder = null
  }

  private detachMotion(): void {
    if (this.motionHandler) window.removeEventListener('devicemotion', this.motionHandler)
    this.motionHandler = null
  }
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
