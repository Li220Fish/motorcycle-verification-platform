import type { VoltageProbe } from './probe.interface'
import type { VoltageSample } from './probe.types'

const SAMPLE_INTERVAL_MS = 100
const CRANKING_DURATION_MS = 1500

type MockPhase = 'rest' | 'cranking' | 'running'

const PHASE_RANGES: Record<MockPhase, { base: number; jitter: number }> = {
  rest: { base: 12.6, jitter: 0.05 },
  cranking: { base: 10.1, jitter: 0.35 },
  running: { base: 13.95, jitter: 0.15 },
}

function randomJitter(spread: number): number {
  return (Math.random() * 2 - 1) * spread
}

/**
 * Simulates a real voltage probe so the rest of the app (UI, stores,
 * analysis) can be built and tested before real BLE hardware is ready.
 */
export class MockProbeService implements VoltageProbe {
  private connected = false
  private measuring = false
  private phase: MockPhase = 'rest'
  private intervalHandle: ReturnType<typeof setInterval> | null = null
  private crankingTimeoutHandle: ReturnType<typeof setTimeout> | null = null
  private callbacks: Array<(data: VoltageSample) => void> = []

  async connect(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 300))
    this.connected = true
    this.phase = 'rest'
  }

  async disconnect(): Promise<void> {
    await this.stopMeasurement()
    this.connected = false
    this.phase = 'rest'
  }

  isConnected(): boolean {
    return this.connected
  }

  async startMeasurement(): Promise<void> {
    if (!this.connected || this.measuring) return
    this.measuring = true
    this.intervalHandle = setInterval(() => {
      const sample: VoltageSample = {
        timestamp: Date.now(),
        voltage: this.generateVoltage(),
      }
      this.callbacks.forEach((callback) => callback(sample))
    }, SAMPLE_INTERVAL_MS)
  }

  async stopMeasurement(): Promise<void> {
    this.measuring = false
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle)
      this.intervalHandle = null
    }
    if (this.crankingTimeoutHandle) {
      clearTimeout(this.crankingTimeoutHandle)
      this.crankingTimeoutHandle = null
    }
  }

  onVoltage(callback: (data: VoltageSample) => void): void {
    this.callbacks.push(callback)
  }

  /**
   * Mock-only: simulates pressing the starter (voltage dip) followed
   * automatically by the engine catching (voltage rises to charging level).
   */
  simulateEngineStart(): void {
    if (!this.connected) return
    this.phase = 'cranking'
    if (this.crankingTimeoutHandle) clearTimeout(this.crankingTimeoutHandle)
    this.crankingTimeoutHandle = setTimeout(() => {
      this.phase = 'running'
    }, CRANKING_DURATION_MS)
  }

  private generateVoltage(): number {
    const { base, jitter } = PHASE_RANGES[this.phase]
    return Number((base + randomJitter(jitter)).toFixed(2))
  }
}
