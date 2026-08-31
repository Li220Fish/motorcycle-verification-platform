<script setup lang="ts">
import type { DiscussionSort } from '@/services/discussion/discussion.types'

const FILTERS: { value: DiscussionSort; label: string }[] = [
  { value: 'hot', label: '熱門' },
  { value: 'new', label: '最新' },
  { value: 'featured', label: '精選' },
  { value: 'following', label: '追蹤中' },
]

defineProps<{ modelValue: DiscussionSort }>()
defineEmits<{ 'update:modelValue': [DiscussionSort] }>()
</script>

<template>
  <div class="chip-row">
    <button
      v-for="f in FILTERS"
      :key="f.value"
      class="chip"
      :class="{ active: modelValue === f.value }"
      @click="$emit('update:modelValue', f.value)"
    >
      {{ f.label }}
    </button>
  </div>
</template>

<style scoped>
.chip-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.chip {
  flex-shrink: 0;
  font-size: 12.5px;
  font-weight: 700;
  padding: 7px 14px;
  border-radius: 999px;
  background: var(--color-background);
  color: var(--color-text-secondary);
  border: 1px solid transparent;
}

.chip.active {
  background: var(--color-primary);
  color: #fff;
}
</style>
