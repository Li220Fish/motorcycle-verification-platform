import type { ImuSample } from '@tofu/core/imu'

// Extracted from the RiDE app (src/services/motion/motion-capture.service.ts):
// accelerometer incl. gravity (m/s²) + rotation rate (deg/s).

type MotionCtor = typeof DeviceMotionEvent & { requestPermission?: () => Promise<'granted' | 'denied'> }

let handler: ((event: DeviceMotionEvent) => void) | null = null

export function motionSupported(): boolean {
  return typeof DeviceMotionEvent !== 'undefined'
}

export async function startMotion(onSample: (sample: ImuSample) => void): Promise<void> {
  if (!motionSupported()) throw new Error('這支手機不支援動作感測')
  const ctor = DeviceMotionEvent as MotionCtor
  if (typeof ctor.requestPermission === 'function' && (await ctor.requestPermission()) !== 'granted')
    throw new Error('需要動作感測權限')
  stopMotion()
  handler = (event) => {
    const a = event.accelerationIncludingGravity
    if (!a) return
    const r = event.rotationRate
    onSample({
      t: Date.now(),
      x: a.x ?? 0,
      y: a.y ?? 0,
      z: a.z ?? 0,
      gx: r?.alpha ?? 0,
      gy: r?.beta ?? 0,
      gz: r?.gamma ?? 0,
    })
  }
  window.addEventListener('devicemotion', handler)
}

export function stopMotion(): void {
  if (handler) window.removeEventListener('devicemotion', handler)
  handler = null
}
