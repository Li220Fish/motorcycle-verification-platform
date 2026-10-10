<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import type { DiscussionSort } from '@/services/discussion/discussion.types'

// 車輛新知 isn't a post sort — it swaps the whole panel below this chip-row
// for VehicleKnowledgeSection instead of the post feed (see DiscussionView.vue)
// — but it reads as just one more chip alongside 熱門/最新/精選/追蹤中.
export type DiscussionViewMode = DiscussionSort | 'vehicleKnowledge'

const FILTERS: {
  value: DiscussionViewMode
  labelKey:
    'filterHot' | 'filterNew' | 'filterFeatured' | 'filterFollowing' | 'filterVehicleKnowledge'
}[] = [
  { value: 'hot', labelKey: 'filterHot' },
  { value: 'new', labelKey: 'filterNew' },
  { value: 'featured', labelKey: 'filterFeatured' },
  { value: 'following', labelKey: 'filterFollowing' },
  { value: 'vehicleKnowledge', labelKey: 'filterVehicleKnowledge' },
]

defineProps<{ modelValue: DiscussionViewMode }>()
defineEmits<{ 'update:modelValue': [DiscussionViewMode] }>()
const { t } = useI18n()
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
      {{ t('discussion', f.labelKey) }}
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
