export interface GeoFix {
  t: number
  lat: number
  lng: number
  accuracy: number
  /** m/s from the GPS chip, when it reports one. */
  speed: number | null
}

const EARTH_RADIUS_M = 6371000

export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

const MAX_ACCURACY_M = 30
/** Anything implying more than this between two fixes is a GPS jump. */
const MAX_PLAUSIBLE_SPEED = 55 // m/s ≈ 200 km/h
const MOVING_SPEED = 2 // m/s ≈ 7 km/h
const MOVING_HOLD_MS = 5000
const PATH_SPACING_M = 15
const MAX_PATH_POINTS = 400

/**
 * Distance, moving/stopped state and a down-sampled route from raw GPS
 * fixes. Inaccurate fixes are ignored and impossible jumps rejected, so a
 * phone sitting under a roof doesn't rack up phantom kilometres.
 */
export class TripRecorder {
  distanceMeters = 0
  maxSpeed = 0
  readonly path: Array<[number, number]> = []
  private last: GeoFix | null = null
  private lastMovingAt = -Infinity
  private lastPathPoint: GeoFix | null = null

  add(fix: GeoFix): void {
    if (fix.accuracy > MAX_ACCURACY_M) return
    let speed = fix.speed
    if (this.last) {
      const meters = haversineMeters(this.last, fix)
      const seconds = (fix.t - this.last.t) / 1000
      if (seconds <= 0) return
      const implied = meters / seconds
      if (implied > MAX_PLAUSIBLE_SPEED) return
      // Ignore sub-accuracy wobble while parked.
      if (meters > Math.min(fix.accuracy, 10)) this.distanceMeters += meters
      if (speed === null || Number.isNaN(speed)) speed = implied
    }
    if (speed !== null && speed >= MOVING_SPEED) this.lastMovingAt = fix.t
    if (speed !== null) this.maxSpeed = Math.max(this.maxSpeed, speed)
    this.last = { ...fix, speed }
    if (!this.lastPathPoint || haversineMeters(this.lastPathPoint, fix) >= PATH_SPACING_M) {
      this.path.push([Number(fix.lat.toFixed(6)), Number(fix.lng.toFixed(6))])
      this.lastPathPoint = fix
      if (this.path.length > MAX_PATH_POINTS) {
        // Keep the route shape: drop every other point.
        const kept = this.path.filter((_, i) => i % 2 === 0)
        this.path.splice(0, this.path.length, ...kept)
      }
    }
  }

  /** Moving now, or within the last few seconds (rolling to a stop still counts). */
  isMoving(now: number): boolean {
    return now - this.lastMovingAt <= MOVING_HOLD_MS
  }

  get hasFix(): boolean {
    return this.last !== null
  }
}
