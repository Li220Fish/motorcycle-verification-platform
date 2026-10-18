<script setup lang="ts">
import { ref } from 'vue'

import PrimaryButton from '@/components/common/PrimaryButton.vue'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

defineEmits<{ confirm: [] }>()

const checks = ref({
  consent: false,
  helmet: false,
  route: false,
  noDanger: false,
})

function allChecked(): boolean {
  return Object.values(checks.value).every(Boolean)
}
</script>

<template>
  <div class="safety-gate">
    <h2>{{ t('rideSafety', 'title') }}</h2>
    <p class="hint">{{ t('rideSafety', 'hint') }}</p>
    <label class="check-row">
      <input v-model="checks.consent" type="checkbox" />
      <span>{{ t('rideSafety', 'consent') }}</span>
    </label>
    <label class="check-row">
      <input v-model="checks.helmet" type="checkbox" />
      <span>{{ t('rideSafety', 'helmet') }}</span>
    </label>
    <label class="check-row">
      <input v-model="checks.route" type="checkbox" />
      <span>{{ t('rideSafety', 'route') }}</span>
    </label>
    <label class="check-row">
      <input v-model="checks.noDanger" type="checkbox" />
      <span>{{ t('rideSafety', 'noDanger') }}</span>
    </label>
    <PrimaryButton block :disabled="!allChecked()" @click="$emit('confirm')">{{
      t('rideSafety', 'start')
    }}</PrimaryButton>
  </div>
</template>

<style scoped>
.safety-gate {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.safety-gate h2 {
  font-size: 18px;
  font-weight: 700;
}

.hint {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.check-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 14px;
  font-weight: 600;
}

.check-row input {
  width: 18px;
  height: 18px;
  accent-color: var(--color-primary);
}
</style>
