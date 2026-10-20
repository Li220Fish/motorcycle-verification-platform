<script setup lang="ts">
import { computed, ref } from 'vue'

import ProbeStageCard from '@/components/probe/ProbeStageCard.vue'
import { useI18n } from '@/composables/useI18n'
import { buildProbeEvidence, readProbeEvidence } from '@/services/probe/probe-evidence'
import type { ProbeReading } from '@/services/probe/probe-protocol'
import { useProbeStore } from '@/stores/probe.store'
import { useVerificationStore } from '@/stores/verification.store'

const { t } = useI18n()

const props = defineProps<{
  verificationId: string
  itemId: string
  label: string
}>()

const probeStore = useProbeStore()
const verificationStore = useVerificationStore()
const measuring = ref(false)
const failed = ref(false)

/** Latest OCV reading saved under this item (PREP-04 連接專用工具). */
const latestReading = computed<ProbeReading | null>(() => {
  const list = verificationStore.evidenceByItem[props.itemId] ?? []
  for (let i = list.length - 1; i >= 0; i--) {
    const reading = readProbeEvidence(list[i])
    if (reading) return reading
  }
  return null
})

async function handleCapture(): Promise<void> {
  measuring.value = true
  failed.value = false
  try {
    const result = await probeStore.runStage('OCV')
    await verificationStore.addEvidence(
      buildProbeEvidence({
        verificationId: props.verificationId,
        result,
        session: 'manual',
        deviceName: probeStore.deviceName,
        probeMode: probeStore.mode,
        itemId: props.itemId,
      }),
    )
  } catch {
    failed.value = true
  } finally {
    measuring.value = false
  }
}
</script>

<template>
  <div class="voltage-capture">
    <div v-if="!probeStore.connected" class="connect-block">
      <p class="hint">{{ t('voltageEvidence', 'connectHint', { label }) }}</p>
      <button
        class="capture-button"
        :disabled="probeStore.connecting"
        @click="probeStore.connect()"
      >
        {{ probeStore.connecting ? t('probe', 'connecting') : t('voltageEvidence', 'connect') }}
      </button>
      <p v-if="probeStore.errorMessage" class="error">{{ probeStore.errorMessage }}</p>
    </div>
    <template v-else>
      <ProbeStageCard stage="OCV" :reading="latestReading" :running="measuring" />
      <button class="capture-button" :disabled="measuring" @click="handleCapture">
        {{
          measuring ? t('voltageEvidence', 'measuring') : t('voltageEvidence', 'capture', { label })
        }}
      </button>
      <p v-if="failed" class="error">{{ t('voltageEvidence', 'failed') }}</p>
    </template>
  </div>
</template>

<style scoped>
.voltage-capture {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.connect-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.hint {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.capture-button {
  height: 46px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-primary);
  background: var(--color-primary-bg, #e8f1fd);
  color: var(--color-primary);
  font-weight: 600;
}

.capture-button:disabled {
  opacity: 0.6;
}

.error {
  margin: 0;
  font-size: 12.5px;
  color: var(--color-danger);
}
</style>
