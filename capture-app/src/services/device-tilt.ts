/**
 * Phone roll/pitch from the gravity vector, for the viewfinder's level line.
 * Uses devicemotion rather than deviceorientation's gamma: with the phone
 * held upright (beta ≈ 90°), gamma is in gimbal lock and jumps around, which
 * is exactly the pose every side shot is taken in.
 */
import { reactive } from 'vue'

export const tilt = reactive<{ rollDeg: number | null; pitchDeg: number | null }>({
  rollDeg: null,
  pitchDeg: null,
})

type MotionPermission = { requestPermission?: () => Promise<'granted' | 'denied'> }

let listening = false
const SMOOTH = 0.25

function onMotion(event: DeviceMotionEvent): void {
  const g = event.accelerationIncludingGravity
  if (!g || g.x === null || g.y === null || g.z === null) return
  // Sign conventions differ between iOS and Android, so magnitudes are taken
  // where direction doesn't matter: upright portrait → |y| ≈ 9.8.
  const roll = (Math.atan2(g.x, Math.abs(g.y)) * 180) / Math.PI
  const pitch = (Math.atan2(Math.abs(g.y), Math.abs(g.z)) * 180) / Math.PI
  tilt.rollDeg = tilt.rollDeg === null ? roll : tilt.rollDeg + (roll - tilt.rollDeg) * SMOOTH
  tilt.pitchDeg = tilt.pitchDeg === null ? pitch : tilt.pitchDeg + (pitch - tilt.pitchDeg) * SMOOTH
}

/** Must be called from a user gesture on iOS (permission prompt). */
export async function startTilt(): Promise<void> {
  if (listening || typeof DeviceMotionEvent === 'undefined') return
  const ctor = DeviceMotionEvent as unknown as MotionPermission
  if (typeof ctor.requestPermission === 'function') {
    try {
      if ((await ctor.requestPermission()) !== 'granted') return
    } catch {
      return
    }
  }
  window.addEventListener('devicemotion', onMotion)
  listening = true
}

/** Roll is only meaningful while the phone is roughly upright — for the
 *  top-down 三角台 shot it'd measure rotation around the wrong axis. */
export function effectiveRoll(): number | null {
  if (tilt.rollDeg === null || tilt.pitchDeg === null) return null
  return tilt.pitchDeg > 35 ? tilt.rollDeg : null
}
