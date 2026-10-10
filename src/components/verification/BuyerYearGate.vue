<script setup lang="ts">
/** 買家複驗專屬關卡 — only shown when the target vehicle's manufactureYear
 *  is unknown (see VerificationStepsView.vue's needsYearGate). Same "full-
 *  screen gate before the Hub" tier as VehicleTypeGate.vue, not a normal
 *  checklist item — this is a one-time question, not something that should
 *  participate in section progress/required-item counting. */
import { ref } from 'vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'

const emit = defineEmits<{ confirm: [number] }>()

const CURRENT_YEAR = new Date().getFullYear()
const yearInput = ref('')
const canSubmit = ref(false)

function handleInput(): void {
  const year = Number(yearInput.value)
  canSubmit.value = yearInput.value.trim().length === 4 && year >= 1990 && year <= CURRENT_YEAR + 1
}

function submit(): void {
  if (!canSubmit.value) return
  emit('confirm', Number(yearInput.value))
}
</script>

<template>
  <div class="year-gate">
    <h2>這台車是幾年的車？</h2>
    <p class="hint">賣家還沒填寫這台車的年式，請先確認一下，這會影響後續檢查項目的判斷標準。</p>
    <input
      v-model="yearInput"
      type="number"
      inputmode="numeric"
      :placeholder="`例如：${CURRENT_YEAR - 2}`"
      class="year-input"
      @input="handleInput"
    />
    <PrimaryButton block :disabled="!canSubmit" @click="submit">確認</PrimaryButton>
  </div>
</template>

<style scoped>
.year-gate {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  margin: var(--space-md);
}

.year-gate h2 {
  font-size: 18px;
  font-weight: 700;
}

.hint {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.year-input {
  height: 46px;
  padding: 0 var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 16px;
  color: var(--color-text-primary);
  background: var(--color-background);
}
</style>
