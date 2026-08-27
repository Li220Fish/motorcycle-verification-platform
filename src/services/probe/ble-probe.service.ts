import { platformService } from '@/services/platform/platform.service'

import type { VoltageProbe } from './probe.interface'
import type { VoltageSample } from './probe.types'

/**
 * Real BLE adapter placeholder. V0.1 does not ship a working voltage probe
 * over BLE — this class exists so the app architecture and UI never depend
 * directly on MockProbeService, and a future version can fill these methods
 * in (Web Bluetooth GATT calls on web, a native BLE plugin on Android/iOS)
 * without touching any caller.
 */
export class BleProbeService implements VoltageProbe {
  private connected = false
  private callbacks: Array<(data: VoltageSample) => void> = []

  static isSupported(): boolean {
    if (platformService.isNative()) {
      // Native BLE adapter (Android/iOS) is reserved for a future version.
      return false
    }
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator
  }

  async connect(): Promise<void> {
    if (!BleProbeService.isSupported()) {
      throw new Error('BLE is not supported on this platform yet. Use the Mock Probe instead.')
    }
    // TODO: real GATT service/characteristic UUIDs once hardware is finalized.
    throw new Error('Real BLE voltage probe is not implemented yet.')
  }

  async disconnect(): Promise<void> {
    this.connected = false
  }

  isConnected(): boolean {
    return this.connected
  }

  async startMeasurement(): Promise<void> {
    throw new Error('Real BLE voltage probe is not implemented yet.')
  }

  async stopMeasurement(): Promise<void> {
    // no-op until real BLE measurement exists
  }

  onVoltage(callback: (data: VoltageSample) => void): void {
    this.callbacks.push(callback)
  }
}
