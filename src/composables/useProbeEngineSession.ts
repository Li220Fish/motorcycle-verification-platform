import { computed, ref } from 'vue'

import { buildProbeEvidence } from '@/services/probe/probe-evidence'
import type { ProbeStage, ProbeStageResult } from '@/services/probe/probe-protocol'
import { ProbeError, type ProbeErrorCode } from '@/services/probe/probe.service'
import { useProbeStore } from '@/stores/probe.store'
import { useVerificationStore } from '@/stores/verification.store'

/**
 * Probe stages woven into EngineInspectionFlow's fixed recording, when this
 * verification opted in (ProbeUsePrompt) and a probe is connected:
 *
 * cold session — OCV + IR right before recording starts (engine still off,
 *   ~1s total), then CRANK fired at t=0 so the firmware's 10s trigger window
 *   covers "請現在發動引擎" (0-5s) while audio+IMU record the same start, and
 *   CHARGE straight after (5s settle + 2s sample) during the idle phase.
 * hot session (buyer 熱車) — CHARGE at t=0, inside the 9s idle phase.
 *
 * Every reading is saved as `voltage` evidence (probe-evidence.ts) the moment
 * it arrives. A failed or missing reading never blocks the inspection — the
 * probe is optional extra data, the audio/IMU session is what the checklist
 * items depend on.
 */
export function useProbeEngineSession(verificationId: () => string, session: () => 'cold' | 'hot') {
  const probeStore = useProbeStore()
  const verificationStore = useVerificationStore()

  const optedIn = computed(() => probeStore.choiceFor(verificationId()) === true)
  const active = computed(() => optedIn.value && probeStore.connected)
  const needsReconnect = computed(() => optedIn.value && !probeStore.connected)

  const preStartStages = computed<ProbeStage[]>(() => (session() === 'cold' ? ['OCV', 'IR'] : []))
  const recordingStages = computed<ProbeStage[]>(() =>
    session() === 'cold' ? ['CRANK', 'CHARGE'] : ['CHARGE'],
  )
  const allStages = computed(() => [...preStartStages.value, ...recordingStages.value])

  const readings = ref<Partial<Record<ProbeStage, ProbeStageResult>>>({})
  const failures = ref<Partial<Record<ProbeStage, ProbeErrorCode>>>({})
  /** Stages this run actually attempted — drives which cards the UI shows. */
  const attempted = ref<ProbeStage[]>([])
  let runToken = 0

  async function runAndSave(stage: ProbeStage, token: number): Promise<void> {
    if (token !== runToken || !probeStore.connected) return
    attempted.value = [...attempted.value, stage]
    try {
      const result = await probeStore.runStage(stage)
      if (token !== runToken) return
      readings.value = { ...readings.value, [stage]: result }
      await verificationStore.addEvidence(
        buildProbeEvidence({
          verificationId: verificationId(),
          result,
          session: session(),
          deviceName: probeStore.deviceName,
          probeMode: probeStore.mode,
        }),
      )
    } catch (error) {
      if (token !== runToken) return
      failures.value = {
        ...failures.value,
        [stage]: error instanceof ProbeError ? error.code : 'PROBE_DISCONNECTED',
      }
    }
  }

  /** Awaited right before the recording starts — clears the previous
   *  attempt's readings, then runs OCV + IR (cold session; nothing for hot). */
  async function runPreStart(): Promise<void> {
    runToken++
    readings.value = {}
    failures.value = {}
    attempted.value = []
    if (!active.value) return
    const token = runToken
    for (const stage of preStartStages.value) await runAndSave(stage, token)
  }

  /** Fired (not awaited) at the recording's t=0. */
  function startWithRecording(): void {
    if (!active.value) return
    const token = runToken
    void (async () => {
      for (const stage of recordingStages.value) await runAndSave(stage, token)
    })()
  }

  /** Recording cancelled/interrupted — stop sending and put the firmware back
   *  to IDLE if it's mid-stage, so the next attempt isn't answered BUSY. */
  function cancel(): void {
    runToken++
    if (probeStore.runningStage) void probeStore.reset()
  }

  const runningStage = computed(() =>
    probeStore.runningStage && allStages.value.includes(probeStore.runningStage)
      ? probeStore.runningStage
      : null,
  )

  return {
    optedIn,
    active,
    needsReconnect,
    preStartStages,
    recordingStages,
    readings,
    failures,
    attempted,
    runningStage,
    runPreStart,
    startWithRecording,
    cancel,
  }
}
