import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'

import type { GeoFix } from '@tofu/core/geo'

let watchId: string | null = null

export async function ensureLocationPermission(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  const status = await Geolocation.checkPermissions()
  if (status.location === 'granted') return
  const requested = await Geolocation.requestPermissions({ permissions: ['location'] })
  if (requested.location !== 'granted') throw new Error('需要定位權限才能計算送貨距離')
}

export async function startGps(onFix: (fix: GeoFix) => void, onError: (message: string) => void): Promise<void> {
  await ensureLocationPermission()
  await stopGps()
  watchId = await Geolocation.watchPosition(
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    (position, error) => {
      if (error || !position) {
        onError(error?.message ?? '定位失敗')
        return
      }
      onFix({
        t: position.timestamp,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        speed: position.coords.speed ?? null,
      })
    },
  )
}

export async function stopGps(): Promise<void> {
  if (watchId) await Geolocation.clearWatch({ id: watchId }).catch(() => {})
  watchId = null
}
