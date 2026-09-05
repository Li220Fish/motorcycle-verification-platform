export interface MotionSample {
  timestamp: number
  x: number
  y: number
  z: number
  /** Gyroscope-equivalent rotation rate (deg/s) — from DeviceMotionEvent's
   *  own `rotationRate`, no separate sensor/permission needed. Added for the
   *  Engine Audio/IMU backend (verifications/{id}/evidence's `imu` JSON,
   *  see EngineInspectionFlow.vue) — MotionEvidenceCapture.vue's older
   *  ride-vibration usage only ever reads x/y/z, so this is purely additive. */
  gx: number
  gy: number
  gz: number
}

type DeviceMotionEventWithPermission = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

/**
 * Records raw accelerometer + rotation-rate samples during a capture
 * session. No interpretation ("frame bent", "suspension worn", "stable
 * idle") is computed from this data here — that lives in the Trusted
 * Backend's IMU pipeline (functions/src/imu/), per the Engine Audio/IMU
 * Technical spec's "IMU 不直接丟 Gemini... 自有 deterministic feature
 * extraction" and "Preprocess/normalize on the backend, not the client".
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
      const rotation = event.rotationRate
      onSample({
        timestamp: Date.now(),
        x: acceleration.x ?? 0,
        y: acceleration.y ?? 0,
        z: acceleration.z ?? 0,
        gx: rotation?.alpha ?? 0,
        gy: rotation?.beta ?? 0,
        gz: rotation?.gamma ?? 0,
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

function magnitude(sample: MotionSample): number {
  return Math.sqrt(sample.x ** 2 + sample.y ** 2 + sample.z ** 2)
}

function stddev(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

export interface MotionSummary {
  sampleCount: number
  avgMagnitude: number
  stddevMagnitude: number
}

/** Shared by MotionEvidenceCapture.vue and EngineInspectionFlow.vue so both
 *  produce the exact same evidence metadata shape from raw samples. No
 *  interpretation ("stable"/"unstable") happens here — just the same
 *  summary numbers every consumer already stored. */
export function computeMotionSummary(samples: MotionSample[]): MotionSummary {
  const magnitudes = samples.map(magnitude)
  return {
    sampleCount: samples.length,
    avgMagnitude: Number(
      (magnitudes.reduce((sum, value) => sum + value, 0) / (magnitudes.length || 1)).toFixed(3),
    ),
    stddevMagnitude: Number(stddev(magnitudes).toFixed(3)),
  }
}
