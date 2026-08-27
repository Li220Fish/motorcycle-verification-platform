import type { VoltageSample } from '@/services/probe/probe.types'
import type { VoltageAnalysisResult } from '@/types/voltage-session'

/**
 * V0.1 only computes basic aggregates. Real signal analysis (V_rest,
 * V_min_start, voltage drop, V_idle, V_rpm correlation, pass/fail rules)
 * is deliberately out of scope until the checklist/verification flow lands.
 */
export function analyzeVoltage(samples: VoltageSample[]): VoltageAnalysisResult {
  if (samples.length === 0) {
    return { minVoltage: 0, maxVoltage: 0, averageVoltage: 0, sampleCount: 0 }
  }

  const voltages = samples.map((sample) => sample.voltage)
  const sum = voltages.reduce((total, voltage) => total + voltage, 0)

  return {
    minVoltage: Number(Math.min(...voltages).toFixed(2)),
    maxVoltage: Number(Math.max(...voltages).toFixed(2)),
    averageVoltage: Number((sum / voltages.length).toFixed(2)),
    sampleCount: samples.length,
  }
}
