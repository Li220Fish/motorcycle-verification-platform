<script setup lang="ts">
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import type { EngineTransmissionType } from '@/data/verification/engine-session'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

defineEmits<{ pick: [EngineTransmissionType] }>()
</script>

<template>
  <div class="vehicle-type-gate">
    <h2>{{ t('vehicleTypeGate', 'title') }}</h2>
    <p class="hint">
      {{ t('vehicleTypeGate', 'hint') }}
    </p>
    <div class="type-pick">
      <PrimaryButton variant="secondary" block @click="$emit('pick', 'scooter')">
        {{ t('vehicleTypeGate', 'scooter') }}
      </PrimaryButton>
      <PrimaryButton block @click="$emit('pick', 'manual')">{{
        t('vehicleTypeGate', 'manual')
      }}</PrimaryButton>
    </div>
  </div>
</template>

<style scoped>
.vehicle-type-gate {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  margin: var(--space-md);
  /* This screen has no AppHeader ancestor (renders before the step flow's
     header), so it needs its own top inset — without it, the card sits
     flush under the status bar/notch on Android/iOS. */
  margin-top: calc(var(--space-md) + var(--safe-area-inset-top, env(safe-area-inset-top)));
}

.vehicle-type-gate h2 {
  font-size: 18px;
  font-weight: 700;
}

.hint {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.type-pick {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
</style>
