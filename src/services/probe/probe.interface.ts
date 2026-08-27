import type { VoltageSample } from './probe.types'

export interface VoltageProbe {
  connect(): Promise<void>

  disconnect(): Promise<void>

  isConnected(): boolean

  startMeasurement(): Promise<void>

  stopMeasurement(): Promise<void>

  onVoltage(callback: (data: VoltageSample) => void): void
}
