<script setup lang="ts">
import { ref } from 'vue'

import PrimaryButton from '@/components/common/PrimaryButton.vue'

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
    <h2>安全確認</h2>
    <p class="hint">試駕前請確認以下事項，全部勾選後才能開始。</p>
    <label class="check-row">
      <input v-model="checks.consent" type="checkbox" />
      <span>已取得車主同意</span>
    </label>
    <label class="check-row">
      <input v-model="checks.helmet" type="checkbox" />
      <span>已佩戴安全帽</span>
    </label>
    <label class="check-row">
      <input v-model="checks.route" type="checkbox" />
      <span>路線適合</span>
    </label>
    <label class="check-row">
      <input v-model="checks.noDanger" type="checkbox" />
      <span>不會進行危險測試</span>
    </label>
    <PrimaryButton block :disabled="!allChecked()" @click="$emit('confirm')"
      >開始試駕</PrimaryButton
    >
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
