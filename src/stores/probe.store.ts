import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import type {
  ProbeMessage,
  ProbeStage,
  ProbeStageResult,
  ProbeStatusReport,
} from '@/services/probe/probe-protocol'
import {
  ProbeError,
  probeService,
  type ProbeLogEntry,
  type ProbeMode,
} from '@/services/probe/probe.service'

const MODE_KEY = 'motoverify:probeMode'
const CHOICE_KEY_PREFIX = 'motoverify:probeUse:'
const LOG_LIMIT = 200

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Private mode / blocked storage — the choice just won't survive a reload.
  }
}

/** Cancelling the Android picker / browser chooser is not an error worth
 *  showing — the user simply backed out. */
function isUserCancel(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error)
  return /cancel|NotFoundError|no device selected/i.test(text)
}

export const useProbeStore = defineStore('probe', () => {
  const storedMode = readStorage(MODE_KEY)
  const mode = ref<ProbeMode>(storedMode === 'mock' ? 'mock' : 'ble')
  probeService.setMode(mode.value)

  const connectionState = ref<'disconnected' | 'connecting' | 'connected'>(
    probeService.isConnected() ? 'connected' : 'disconnected',
  )
  const deviceName = ref<string | null>(probeService.getConnection()?.name ?? null)
  const runningStage = ref<ProbeStage | null>(null)
  const progress = ref<ProbeMessage | null>(null)
  const results = ref<Partial<Record<ProbeStage, ProbeStageResult>>>({})
  const errorMessage = ref('')
  const log = ref<ProbeLogEntry[]>([])
  /** Latest STATUS_REPORT — clips on the battery + live voltage. */
  const statusReport = ref<ProbeStatusReport | null>(null)
  const choices = ref<Record<string, boolean>>({})

  const connected = computed(() => connectionState.value === 'connected')
  const connecting = computed(() => connectionState.value === 'connecting')
  const bleSupported = probeService.isBleSupported()

  probeService.onLog((entry) => {
    // STATUS polling every 2s would bury the stage traffic the log is for.
    if (entry.text === 'STATUS' || entry.text.includes('"STATUS_REPORT"')) return
    log.value = [...log.value.slice(-(LOG_LIMIT - 1)), entry]
  })
  probeService.onDisconnected(() => {
    connectionState.value = 'disconnected'
    runningStage.value = null
    progress.value = null
    statusReport.value = null
  })

  function setMode(next: ProbeMode): void {
    if (connected.value || connecting.value) return
    mode.value = next
    probeService.setMode(next)
    writeStorage(MODE_KEY, next)
  }

  async function connect(): Promise<boolean> {
    if (connected.value) return true
    errorMessage.value = ''
    connectionState.value = 'connecting'
    try {
      const connection = await probeService.connect()
      deviceName.value = connection.name
      connectionState.value = 'connected'
      return true
    } catch (error) {
      connectionState.value = 'disconnected'
      if (!isUserCancel(error)) {
        errorMessage.value = error instanceof Error ? error.message : String(error)
      }
      return false
    }
  }

  async function disconnect(): Promise<void> {
    await probeService.disconnect()
    connectionState.value = 'disconnected'
    runningStage.value = null
    progress.value = null
    statusReport.value = null
  }

  /** Never while a stage runs — the stage's own progress is what matters then. */
  async function refreshStatus(): Promise<ProbeStatusReport | null> {
    if (!connected.value || runningStage.value) return statusReport.value
    const report = await probeService.queryStatus()
    if (report) statusReport.value = report
    return report
  }

  /** Polls STATUS every `intervalMs` while connected and idle; returns stop(). */
  function watchStatus(intervalMs = 2000): () => void {
    void refreshStatus()
    const handle = setInterval(() => void refreshStatus(), intervalMs)
    return () => clearInterval(handle)
  }

  /** Runs one stage and keeps its latest result. Rejects with a ProbeError
   *  (code = PROBE_DISCONNECTED | PROBE_BUSY | PROBE_INVALID | PROBE_TIMEOUT). */
  async function runStage(stage: ProbeStage): Promise<ProbeStageResult> {
    errorMessage.value = ''
    runningStage.value = stage
    progress.value = null
    try {
      const result = await probeService.runStage(stage, (message) => {
        progress.value = message
      })
      results.value = { ...results.value, [stage]: result }
      return result
    } catch (error) {
      errorMessage.value = error instanceof ProbeError ? error.code : String(error)
      throw error
    } finally {
      if (runningStage.value === stage) runningStage.value = null
      progress.value = null
    }
  }

  async function reset(): Promise<void> {
    await probeService.reset().catch(() => {})
  }

  function clearResults(): void {
    results.value = {}
    log.value = []
  }

  function simulateCrank(): void {
    probeService.simulateCrank()
  }

  /** Per-verification answer to "use the probe for this inspection?" —
   *  null means not asked yet. Persisted so leaving and resuming a draft
   *  doesn't ask again. */
  function choiceFor(verificationId: string): boolean | null {
    if (verificationId in choices.value) return choices.value[verificationId]
    const stored = readStorage(CHOICE_KEY_PREFIX + verificationId)
    return stored === null ? null : stored === 'yes'
  }

  function setChoice(verificationId: string, useProbe: boolean): void {
    choices.value = { ...choices.value, [verificationId]: useProbe }
    writeStorage(CHOICE_KEY_PREFIX + verificationId, useProbe ? 'yes' : 'no')
  }

  /** True when this verification opted in AND a probe is connected right now. */
  function activeFor(verificationId: string): boolean {
    return connected.value && choiceFor(verificationId) === true
  }

  return {
    mode,
    connectionState,
    connected,
    connecting,
    bleSupported,
    deviceName,
    runningStage,
    progress,
    results,
    errorMessage,
    log,
    statusReport,
    refreshStatus,
    watchStatus,
    setMode,
    connect,
    disconnect,
    runStage,
    reset,
    clearResults,
    simulateCrank,
    choiceFor,
    setChoice,
    activeFor,
  }
})
