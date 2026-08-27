import { BleClient } from '@capacitor-community/bluetooth-le'
import type { BleDevice, ScanResult } from '@capacitor-community/bluetooth-le'

let initialized = false

async function ensureInitialized(): Promise<void> {
  if (initialized) return
  await BleClient.initialize()
  initialized = true
}

async function isEnabled(): Promise<boolean> {
  await ensureInitialized()
  return BleClient.isEnabled()
}

/**
 * Scans for nearby BLE-advertising devices. `onResult` fires once per
 * discovered device; call `stopScan()` to end the scan (there is no
 * fixed duration — the caller decides when enough devices were found).
 */
async function startScan(onResult: (result: ScanResult) => void): Promise<void> {
  await ensureInitialized()
  await BleClient.requestLEScan({}, onResult)
}

async function stopScan(): Promise<void> {
  await BleClient.stopLEScan()
}

/** Devices already paired with the OS. Android only — empty elsewhere. */
async function getBondedDevices(): Promise<BleDevice[]> {
  await ensureInitialized()
  return BleClient.getBondedDevices()
}

/**
 * Devices currently connected at the OS level that advertise at least one
 * of the given service UUIDs. Pass [] to get devices connected by this app.
 */
async function getConnectedDevices(services: string[] = []): Promise<BleDevice[]> {
  await ensureInitialized()
  return BleClient.getConnectedDevices(services)
}

async function connect(deviceId: string, onDisconnect?: (deviceId: string) => void): Promise<void> {
  await ensureInitialized()
  await BleClient.connect(deviceId, onDisconnect)
}

async function disconnect(deviceId: string): Promise<void> {
  await BleClient.disconnect(deviceId)
}

export const bleService = {
  isEnabled,
  startScan,
  stopScan,
  getBondedDevices,
  getConnectedDevices,
  connect,
  disconnect,
}
