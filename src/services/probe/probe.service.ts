import { BleProbeService } from './ble-probe.service'
import { MockProbeService } from './mock-probe.service'
import type { VoltageProbe } from './probe.interface'
import type { ProbeMode, VoltageSample } from './probe.types'

/**
 * Facade over the active probe implementation. V0.1 always defaults to the
 * Mock Probe so BLE hardware availability never blocks the rest of the app.
 */
class ProbeService implements VoltageProbe {
  private mode: ProbeMode = 'mock'
  private readonly mockProbe = new MockProbeService()
  private readonly bleProbe = new BleProbeService()

  getMode(): ProbeMode {
    return this.mode
  }

  setMode(mode: ProbeMode): void {
    this.mode = mode
  }

  isBleSupported(): boolean {
    return BleProbeService.isSupported()
  }

  private get active(): VoltageProbe {
    return this.mode === 'mock' ? this.mockProbe : this.bleProbe
  }

  connect(): Promise<void> {
    return this.active.connect()
  }

  disconnect(): Promise<void> {
    return this.active.disconnect()
  }

  isConnected(): boolean {
    return this.active.isConnected()
  }

  startMeasurement(): Promise<void> {
    return this.active.startMeasurement()
  }

  stopMeasurement(): Promise<void> {
    return this.active.stopMeasurement()
  }

  onVoltage(callback: (data: VoltageSample) => void): void {
    this.active.onVoltage(callback)
  }

  /** Mock-only helper: no-op when running against the real BLE probe. */
  simulateEngineStart(): void {
    if (this.mode === 'mock') {
      this.mockProbe.simulateEngineStart()
    }
  }
}

export const probeService = new ProbeService()
