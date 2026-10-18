<script setup lang="ts">
import { STANDARD_INSPECTION_OPTIONS } from '@/data/verification'
import type { InspectionOption } from '@/data/verification'
import type { AnswerResultValue } from '@/types/verification-evidence'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

withDefaults(
  defineProps<{
    options?: InspectionOption[]
    modelValue: AnswerResultValue | null
  }>(),
  { options: () => STANDARD_INSPECTION_OPTIONS },
)

const emit = defineEmits<{
  'update:modelValue': [AnswerResultValue]
}>()

const STANDARD_KEYS = ['normal', 'attention', 'unsure'] as const
function optionLabel(option: InspectionOption): string {
  const key = STANDARD_KEYS.find((candidate) => candidate === option.value)
  const standard = STANDARD_INSPECTION_OPTIONS.find((o) => o.value === option.value)
  // Only swap in the dictionary label when it's the stock option text —
  // items with custom option labels keep their own wording.
  return key && standard?.label === option.label ? t('resultSelector', key) : option.label
}

function select(value: AnswerResultValue): void {
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="result-selector">
    <p class="label">{{ t('resultSelector', 'label') }}</p>
    <div class="options">
      <label
        v-for="option in options"
        :key="option.value"
        class="option"
        :class="{ active: modelValue === option.value }"
      >
        <input type="radio" :checked="modelValue === option.value" @change="select(option.value)" />
        <span>{{ optionLabel(option) }}</span>
      </label>
    </div>
  </div>
</template>

<style scoped>
.result-selector {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.option {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  background: var(--color-surface);
}

.option.active {
  border-color: var(--color-primary);
  background: #e8f1fd;
  color: var(--color-primary);
}

.option input {
  accent-color: var(--color-primary);
}
</style>
