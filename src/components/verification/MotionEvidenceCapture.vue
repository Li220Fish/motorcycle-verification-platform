<script setup lang="ts">
import { ref } from 'vue'

import {
  computeMotionSummary,
  motionCaptureService,
} from '@/services/motion/motion-capture.service'
import type { MotionSample } from '@/services/motion/motion-capture.service'
import { useVerificationStore } from '@/stores/verification.store'
import type { VerificationEvidence } from '@/types/verification-evidence'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

const props = defineProps<{
  verificationId: string
  itemId: string
  label: string
}>()

const supported = ref(motionCaptureService.isSupported())
const recording = ref(false)
const errorMessage = ref('')
const samples = ref<MotionSample[]>([])
const durationSeconds = 5

async function handleStart(): Promise<void> {
  errorMessage.value = ''
  samples.value = []
  try {
    await motionCaptureService.start((sample) => samples.value.push(sample))
    recording.value = true
    setTimeout(handleStop, durationSeconds * 1000)
  } catch (error) {
    supported.value = false
    errorMessage.value = error instanceof Error ? error.message : t('motionEvidence', 'unsupported')
  }
}

async function handleStop(): Promise<void> {
  motionCaptureService.stop()
  recording.value = false

  // `DeviceMotionEvent` exists as a constructor on plenty of devices/browsers
  // that never actually dispatch it (desktop Chrome, some Android WebViews
  // without permission granted, etc) — isSupported() alone can't detect that
  // ahead of time. Recording zero samples must still produce evidence
  // (marked as such) instead of silently no-op'ing: a required-evidence gate
  // with no achievable evidence on that device would be a permanent dead end.
  const hasSamples = samples.value.length > 0
  const summary = computeMotionSummary(samples.value)
  const evidence: VerificationEvidence = {
    id: crypto.randomUUID(),
    verificationId: props.verificationId,
    itemId: props.itemId,
    type: 'manual', // no dedicated 'motion' EvidenceType yet — reuse the generic sensor-reading shape
    createdAt: Date.now(),
    captureSource: 'manual',
    captureTimestamp: Date.now(),
    metadata: hasSamples
      ? { label: props.label, ...summary }
      : { label: props.label, sampleCount: 0, unsupported: true },
  }
  await useVerificationStore().addEvidence(evidence)
  if (!hasSamples) {
    errorMessage.value = t('motionEvidence', 'noData')
  }
}

function latestReading(): { avgMagnitude: number; stddevMagnitude: number } | null {
  const list = useVerificationStore().evidenceByItem[props.itemId] ?? []
  const latest = list[list.length - 1]
  if (!latest || typeof latest.metadata?.avgMagnitude !== 'number') return null
  return {
    avgMagnitude: latest.metadata.avgMagnitude as number,
    stddevMagnitude: (latest.metadata.stddevMagnitude as number) ?? 0,
  }
}
</script>

<template>
  <div class="motion-capture">
    <template v-if="!supported">
      <p class="hint">{{ t('motionEvidence', 'unsupportedHint') }}</p>
    </template>
    <template v-else>
      <p class="hint">
        {{ t('motionEvidence', 'instructions', { seconds: durationSeconds }) }}
      </p>
      <button v-if="!recording" class="capture-button" @click="handleStart">
        {{ t('motionEvidence', 'start') }}
      </button>
      <p v-else class="recording">
        {{ t('motionEvidence', 'collecting', { seconds: durationSeconds }) }}
      </p>
      <p v-if="latestReading()" class="captured">
        {{
          t('motionEvidence', 'recorded', {
            avg: latestReading()?.avgMagnitude ?? '',
            std: latestReading()?.stddevMagnitude ?? '',
          })
        }}
      </p>
    </template>
    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
  </div>
</template>

<style scoped>
.motion-capture {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.hint {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.capture-button {
  height: 46px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-primary);
  background: #e8f1fd;
  color: var(--color-primary);
  font-weight: 600;
}

.recording {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary);
  text-align: center;
}

.captured {
  font-size: 13px;
  color: var(--color-success);
  font-weight: 600;
}

.error {
  color: var(--color-danger);
  font-size: 13px;
}
</style>
