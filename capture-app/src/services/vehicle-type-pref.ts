/**
 * Remembers the last 速克達/檔車 choice on this phone, so a collector shooting
 * a row of scooters doesn't re-pick it for every bike. Per-device
 * convenience only — the authoritative value is on each session/capture.
 */
import type { VehicleType } from '@/data/training/training-dataset.types'

const KEY = 'ride-capture:vehicle-type'

export function lastVehicleType(): VehicleType {
  try {
    return localStorage.getItem(KEY) === 'manual' ? 'manual' : 'scooter'
  } catch {
    return 'scooter'
  }
}

export function rememberVehicleType(t: VehicleType): void {
  try {
    localStorage.setItem(KEY, t)
  } catch {
    /* ignore */
  }
}
