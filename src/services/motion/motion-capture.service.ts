export interface MotionSample {
  timestamp: number
  x: number
  y: number
  z: number
}

type DeviceMotionEventWithPermission = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

/**
 * Records raw accelerometer samples during a ride session. V0.2 only stores
 * timestamp/x/y/z — no interpretation ("frame bent", "suspension worn") is
 * computed from this data. See V0.2 spec §24.
 */
class MotionCaptureService {
  private handler: ((event: DeviceMotionEvent) => void) | null = null

  isSupported(): boolean {
    return typeof DeviceMotionEvent !== 'undefined'
  }

  async start(onSample: (sample: MotionSample) => void): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('此裝置暫不支援動態感測')
    }

    const ctor = DeviceMotionEvent as DeviceMotionEventWithPermission
    if (typeof ctor.requestPermission === 'function') {
      const permission = await ctor.requestPermission()
      if (permission !== 'granted') {
        throw new Error('此裝置暫不支援動態感測')
      }
    }

    this.handler = (event) => {
      const acceleration = event.accelerationIncludingGravity
      if (!acceleration) return
      onSample({
        timestamp: Date.now(),
        x: acceleration.x ?? 0,
        y: acceleration.y ?? 0,
        z: acceleration.z ?? 0,
      })
    }
    window.addEventListener('devicemotion', this.handler)
  }

  stop(): void {
    if (this.handler) {
      window.removeEventListener('devicemotion', this.handler)
      this.handler = null
    }
  }
}

export const motionCaptureService = new MotionCaptureService()
