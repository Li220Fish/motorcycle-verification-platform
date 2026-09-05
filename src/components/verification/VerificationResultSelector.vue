<script setup lang="ts">
import { STANDARD_INSPECTION_OPTIONS } from '@/data/verification'
import type { InspectionOption } from '@/data/verification'
import type { AnswerResultValue } from '@/types/verification-evidence'

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

function select(value: AnswerResultValue): void {
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="result-selector">
    <p class="label">目前結果</p>
    <div class="options">
      <label
        v-for="option in options"
        :key="option.value"
        class="option"
        :class="{ active: modelValue === option.value }"
      >
        <input type="radio" :checked="modelValue === option.value" @change="select(option.value)" />
        <span>{{ option.label }}</span>
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
