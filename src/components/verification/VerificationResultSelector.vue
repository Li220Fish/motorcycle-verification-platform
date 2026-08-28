<script setup lang="ts">
import { ref } from 'vue'

import { STANDARD_INSPECTION_OPTIONS } from '@/data/verification'
import type { InspectionOption } from '@/data/verification'
import type { AnswerResultValue } from '@/types/verification-evidence'

const props = withDefaults(
  defineProps<{
    options?: InspectionOption[]
    modelValue: AnswerResultValue | null
    cannotCheckReason?: string
  }>(),
  { options: () => STANDARD_INSPECTION_OPTIONS, cannotCheckReason: '' },
)

const emit = defineEmits<{
  'update:modelValue': [AnswerResultValue]
  'update:cannotCheckReason': [string]
}>()

const showCannotCheck = ref(props.modelValue === 'cannot_check')

function select(value: AnswerResultValue): void {
  showCannotCheck.value = false
  emit('update:modelValue', value)
}

function selectCannotCheck(): void {
  showCannotCheck.value = true
  emit('update:modelValue', 'cannot_check')
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
      <label class="option" :class="{ active: modelValue === 'cannot_check' }">
        <input type="radio" :checked="modelValue === 'cannot_check'" @change="selectCannotCheck" />
        <span>無法檢查</span>
      </label>
    </div>

    <label v-if="showCannotCheck" class="reason-field">
      <span>請說明無法檢查的原因</span>
      <input
        :value="cannotCheckReason"
        type="text"
        placeholder="例如：光線不足、賣家不同意拆卸"
        @input="emit('update:cannotCheckReason', ($event.target as HTMLInputElement).value)"
      />
    </label>
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

.reason-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.reason-field input {
  height: 36px;
  padding: 0 var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 14px;
}
</style>
