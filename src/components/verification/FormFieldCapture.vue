<script setup lang="ts">
import type { FormFieldDef } from '@/data/verification'

const props = defineProps<{
  fields: FormFieldDef[]
  modelValue: Record<string, string>
}>()

const emit = defineEmits<{ 'update:modelValue': [Record<string, string>] }>()

function handleInput(key: string, value: string): void {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>

<template>
  <div class="form-table">
    <label v-for="field in fields" :key="field.key" class="form-row">
      <span class="form-label"
        >{{ field.label }}<span v-if="field.required" class="required">*</span></span
      >
      <span class="form-input-wrap">
        <input
          :type="field.type"
          :value="modelValue[field.key] ?? ''"
          :placeholder="field.placeholder"
          @input="handleInput(field.key, ($event.target as HTMLInputElement).value)"
        />
        <span v-if="field.unit" class="unit">{{ field.unit }}</span>
      </span>
    </label>
  </div>
</template>

<style scoped>
.form-table {
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
}

@media (min-width: 480px) {
  .form-table {
    grid-template-columns: 1fr 1fr;
  }
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.form-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.required {
  color: var(--color-danger);
  margin-left: 2px;
}

.form-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.form-input-wrap input {
  width: 100%;
  height: 36px;
  padding: 0 var(--space-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-family: inherit;
  color: var(--color-text-primary);
  background: var(--color-surface);
}

.form-input-wrap .unit {
  position: absolute;
  right: var(--space-sm);
  font-size: 12px;
  color: var(--color-text-disabled);
  pointer-events: none;
}

.form-input-wrap:has(.unit) input {
  padding-right: 32px;
}
</style>
