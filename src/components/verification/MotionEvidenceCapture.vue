<script setup lang="ts">
import { ref } from 'vue'

import { motionCaptureService } from '@/services/motion/motion-capture.service'
import type { MotionSample } from '@/services/motion/motion-capture.service'
import { useVerificationStore } from '@/stores/verification.store'
import type { VerificationEvidence } from '@/types/verification-evidence'

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
    errorMessage.value = error instanceof Error ? error.message : '此裝置暫不支援動態感測'
  }
}

function magnitude(sample: MotionSample): number {
  return Math.sqrt(sample.x ** 2 + sample.y ** 2 + sample.z ** 2)
}

function stddev(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
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
  const magnitudes = samples.value.map(magnitude)
  const evidence: VerificationEvidence = {
    id: crypto.randomUUID(),
    verificationId: props.verificationId,
    itemId: props.itemId,
    type: 'manual', // no dedicated 'motion' EvidenceType yet — reuse the generic sensor-reading shape
    createdAt: Date.now(),
    captureSource: 'manual',
    captureTimestamp: Date.now(),
    metadata: hasSamples
      ? {
          label: props.label,
          sampleCount: samples.value.length,
          avgMagnitude: Number(
            (magnitudes.reduce((sum, value) => sum + value, 0) / magnitudes.length).toFixed(3),
          ),
          stddevMagnitude: Number(stddev(magnitudes).toFixed(3)),
        }
      : { label: props.label, sampleCount: 0, unsupported: true },
  }
  await useVerificationStore().addEvidence(evidence)
  if (!hasSamples) {
    errorMessage.value = '此裝置未回傳震動資料，已記錄為無法感測，請依觸感／觀察判斷後繼續下一步。'
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
      <p class="hint">此裝置暫不支援動態感測，可直接依觸感／觀察判斷後繼續下一步。</p>
    </template>
    <template v-else>
      <p class="hint">
        將手機平放於踏板或穩固支架上，再開始收集 {{ durationSeconds }} 秒震動資料。
      </p>
      <button v-if="!recording" class="capture-button" @click="handleStart">
        開始收集震動資料
      </button>
      <p v-else class="recording">收集中...（{{ durationSeconds }} 秒）</p>
      <p v-if="latestReading()" class="captured">
        已記錄：平均震動 {{ latestReading()?.avgMagnitude }}，波動
        {{ latestReading()?.stddevMagnitude }}
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
