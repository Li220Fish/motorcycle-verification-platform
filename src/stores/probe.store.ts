import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { analyzeVoltage } from '@/services/analysis/voltage-analysis.service'
import { probeService } from '@/services/probe/probe.service'
import type { VoltageSample } from '@/services/probe/probe.types'

export const useProbeStore = defineStore('probe', () => {
  const connected = ref(false)
  const measuring = ref(false)
  const currentVoltage = ref<number | null>(null)
  // Raw samples are kept in memory only for this session — see README
  // "Raw Voltage Data" for why they are not written to Firestore directly.
  const samples = ref<VoltageSample[]>([])

  const mode = computed(() => probeService.getMode())
  const recentSamples = computed(() => samples.value.slice(-20).reverse())
  const sampleCount = computed(() => samples.value.length)
  const analysis = computed(() => analyzeVoltage(samples.value))

  let callbackRegistered = false
  function ensureCallback(): void {
    if (callbackRegistered) return
    callbackRegistered = true
    probeService.onVoltage((sample) => {
      samples.value.push(sample)
      currentVoltage.value = sample.voltage
    })
  }

  async function connect(): Promise<void> {
    ensureCallback()
    await probeService.connect()
    connected.value = probeService.isConnected()
  }

  async function disconnect(): Promise<void> {
    await probeService.disconnect()
    connected.value = probeService.isConnected()
    measuring.value = false
  }

  async function start(): Promise<void> {
    samples.value = []
    await probeService.startMeasurement()
    measuring.value = true
  }

  async function stop(): Promise<void> {
    await probeService.stopMeasurement()
    measuring.value = false
  }

  function simulateEngineStart(): void {
    probeService.simulateEngineStart()
  }

  return {
    connected,
    measuring,
    currentVoltage,
    samples,
    mode,
    recentSamples,
    sampleCount,
    analysis,
    connect,
    disconnect,
    start,
    stop,
    simulateEngineStart,
  }
})
