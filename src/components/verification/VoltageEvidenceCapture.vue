<script setup lang="ts">
import { computed } from 'vue'

import { useProbeStore } from '@/stores/probe.store'
import { useVerificationStore } from '@/stores/verification.store'
import type { VerificationEvidence } from '@/types/verification-evidence'

const props = defineProps<{
  verificationId: string
  itemId: string
  label: string
}>()

const probeStore = useProbeStore()
const verificationStore = useVerificationStore()

const isCrankingStage = computed(() => props.label.includes('啟動'))

async function handleConnect(): Promise<void> {
  await probeStore.connect()
  await probeStore.start()
}

async function handleCapture(): Promise<void> {
  if (probeStore.currentVoltage === null) return
  const evidence: VerificationEvidence = {
    id: crypto.randomUUID(),
    verificationId: props.verificationId,
    itemId: props.itemId,
    type: 'voltage',
    createdAt: Date.now(),
    captureSource: 'probe',
    captureTimestamp: Date.now(),
    metadata: {
      label: props.label,
      voltage: probeStore.currentVoltage,
      mode: probeStore.mode,
      sampleCount: probeStore.sampleCount,
    },
  }
  await verificationStore.addEvidence(evidence)
}

function capturedVoltage(): number | null {
  const list = verificationStore.evidenceByItem[props.itemId] ?? []
  const latest = list[list.length - 1]
  return latest && typeof latest.metadata?.voltage === 'number'
    ? (latest.metadata.voltage as number)
    : null
}
</script>

<template>
  <div class="voltage-capture">
    <div v-if="!probeStore.connected" class="connect-block">
      <p class="hint">連接 Voltage Probe 後即可記錄 {{ label }}。</p>
      <button class="capture-button" @click="handleConnect">連接 Probe</button>
    </div>
    <template v-else>
      <div class="reading">
        <span class="reading-label">目前電壓</span>
        <span class="reading-value">
          {{ probeStore.currentVoltage !== null ? probeStore.currentVoltage.toFixed(2) : '--' }} V
        </span>
      </div>
      <button
        v-if="isCrankingStage && probeStore.mode === 'mock'"
        class="capture-button secondary"
        @click="probeStore.simulateEngineStart"
      >
        模擬啟動測試
      </button>
      <button class="capture-button" @click="handleCapture">記錄此讀數（{{ label }}）</button>
      <p v-if="capturedVoltage() !== null" class="captured">已記錄：{{ capturedVoltage() }} V</p>
    </template>
  </div>
</template>

<style scoped>
.voltage-capture {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.hint {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.reading {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: var(--space-md);
  background: var(--color-background);
  border-radius: var(--radius-md);
}

.reading-label {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.reading-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-probe-voltage);
}

.capture-button {
  height: 46px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-primary);
  background: #e8f1fd;
  color: var(--color-primary);
  font-weight: 600;
}

.capture-button.secondary {
  border-color: var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-primary);
}

.captured {
  font-size: 13px;
  color: var(--color-success);
  font-weight: 600;
}
</style>
