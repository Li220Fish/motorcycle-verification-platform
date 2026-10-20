<script setup lang="ts">
import { BatteryCharging } from 'lucide-vue-next'

import PrimaryButton from '@/components/common/PrimaryButton.vue'
import { useI18n } from '@/composables/useI18n'

defineProps<{ deviceName: string }>()
defineEmits<{ choose: [boolean] }>()

const { t } = useI18n()
</script>

<template>
  <Teleport to="body">
    <div class="probe-prompt-overlay" role="dialog" aria-modal="true">
      <div class="probe-prompt-card">
        <div class="probe-prompt-icon"><BatteryCharging :size="26" /></div>
        <h2>{{ t('probeFlow', 'promptTitle') }}</h2>
        <p>{{ t('probeFlow', 'promptBody', { name: deviceName }) }}</p>
        <div class="probe-prompt-actions">
          <PrimaryButton
            variant="secondary"
            block
            data-testid="probe-prompt-no"
            @click="$emit('choose', false)"
          >
            {{ t('probeFlow', 'promptNo') }}
          </PrimaryButton>
          <PrimaryButton block data-testid="probe-prompt-yes" @click="$emit('choose', true)">
            {{ t('probeFlow', 'promptYes') }}
          </PrimaryButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.probe-prompt-overlay {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  background: rgba(8, 12, 20, 0.55);
}

.probe-prompt-card {
  width: 100%;
  max-width: 380px;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  color: var(--color-text-primary);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.25);
}

.probe-prompt-icon {
  width: 48px;
  height: 48px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.probe-prompt-card h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
}

.probe-prompt-card p {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-secondary);
}

.probe-prompt-actions {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}
</style>
