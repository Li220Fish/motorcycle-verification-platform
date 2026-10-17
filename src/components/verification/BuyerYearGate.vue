<script setup lang="ts">
/** 買家複驗專屬關卡 — only shown when the target vehicle's manufactureYear
 *  is unknown (see VerificationStepsView.vue's needsYearGate). Same "full-
 *  screen gate before the Hub" tier as VehicleTypeGate.vue, not a normal
 *  checklist item — this is a one-time question, not something that should
 *  participate in section progress/required-item counting. */
import { computed, ref } from 'vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'

const emit = defineEmits<{ confirm: [number] }>()

const CURRENT_YEAR = new Date().getFullYear()
/** Taiwan's used-bike market genuinely has pre-1990 bikes still on the road
 *  — the original 1990 floor silently left the 確認 button permanently
 *  disabled with zero feedback for anyone typing an older year (found live:
 *  "輸入年份之後就沒辦法繼續往後做了"). 1950 covers any realistic used
 *  motorcycle while still catching obvious typos (e.g. a 4-digit phone
 *  number fragment). */
const MIN_YEAR = 1950
const yearInput = ref('')

const yearError = computed(() => {
  const trimmed = yearInput.value.trim()
  if (!trimmed) return ''
  if (trimmed.length !== 4 || !/^\d{4}$/.test(trimmed)) return '請輸入4位數的西元年，例如 2018'
  const year = Number(trimmed)
  if (year < MIN_YEAR || year > CURRENT_YEAR + 1) {
    return `請輸入 ${MIN_YEAR}~${CURRENT_YEAR + 1} 之間的年份`
  }
  return ''
})
const canSubmit = computed(() => yearInput.value.trim().length === 4 && !yearError.value)

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
    />
    <p v-if="yearError" class="error-text">{{ yearError }}</p>
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
  /* Same "no AppHeader ancestor" top-inset need as VehicleTypeGate.vue. */
  margin-top: calc(var(--space-md) + var(--safe-area-inset-top, env(safe-area-inset-top)));
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

.error-text {
  margin: -4px 0 0;
  font-size: 12.5px;
  color: var(--color-danger);
}
</style>
