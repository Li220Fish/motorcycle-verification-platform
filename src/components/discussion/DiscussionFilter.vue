<script setup lang="ts">
import type { DiscussionSort } from '@/services/discussion/discussion.types'

// 車輛新知 isn't a post sort — it swaps the whole panel below this chip-row
// for VehicleKnowledgeSection instead of the post feed (see DiscussionView.vue)
// — but it reads as just one more chip alongside 熱門/最新/精選/追蹤中.
export type DiscussionViewMode = DiscussionSort | 'vehicleKnowledge'

const FILTERS: { value: DiscussionViewMode; label: string }[] = [
  { value: 'hot', label: '熱門' },
  { value: 'new', label: '最新' },
  { value: 'featured', label: '精選' },
  { value: 'following', label: '追蹤中' },
  { value: 'vehicleKnowledge', label: '車輛資訊' },
]

defineProps<{ modelValue: DiscussionViewMode }>()
defineEmits<{ 'update:modelValue': [DiscussionViewMode] }>()
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
