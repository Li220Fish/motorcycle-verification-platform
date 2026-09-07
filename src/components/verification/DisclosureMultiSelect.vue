<script setup lang="ts">
/** Multi-select self-disclosure checkboxes (e.g. PREP-02 車況主動揭露: 倒車/
 *  碰撞/其他/無). "none" is a reserved value by convention (see
 *  seller-verification.ts's disclosureOptions) — selecting it clears every
 *  other selection and vice versa, since "無" is logically exclusive with
 *  "have an issue to disclose", but the other three can combine freely
 *  (a vehicle can have been both rolled over AND in a collision). */
import type { DisclosureOption } from '@/data/verification'

const props = defineProps<{
  options: DisclosureOption[]
  modelValue: string[]
}>()

const emit = defineEmits<{ 'update:modelValue': [string[]] }>()

function toggle(value: string): void {
  if (value === 'none') {
    emit('update:modelValue', props.modelValue.includes('none') ? [] : ['none'])
    return
  }
  const withoutNone = props.modelValue.filter((selected) => selected !== 'none')
  emit(
    'update:modelValue',
    withoutNone.includes(value)
      ? withoutNone.filter((selected) => selected !== value)
      : [...withoutNone, value],
  )
}
</script>

<template>
  <div class="disclosure-select">
    <p class="label">請複選</p>
    <div class="options">
      <label
        v-for="option in options"
        :key="option.value"
        class="option"
        :class="{ active: modelValue.includes(option.value) }"
      >
        <input
          type="checkbox"
          :checked="modelValue.includes(option.value)"
          @change="toggle(option.value)"
        />
        <span>{{ option.label }}</span>
      </label>
    </div>
  </div>
</template>

<style scoped>
.disclosure-select {
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
