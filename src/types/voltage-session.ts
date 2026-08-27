import type { VoltageSample } from '@/services/probe/probe.types'

export interface VoltageAnalysisResult {
  minVoltage: number
  maxVoltage: number
  averageVoltage: number
  sampleCount: number
}

/**
 * `samples` is only ever populated for a short-lived local/in-memory session.
 * High-frequency raw samples are NOT meant to be written to Firestore as-is —
 * see src/services/analysis and the storage abstraction note in the README.
 */
export interface VoltageSession {
  id: string

  vehicleId: string
  verificationId: string
  probeId?: string

  startedAt: number
  endedAt?: number

  samples?: VoltageSample[]

  result?: VoltageAnalysisResult
}
