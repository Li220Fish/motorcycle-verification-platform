<script setup lang="ts">
import { computed } from 'vue'
import { Bike } from 'lucide-vue-next'

import MotorcycleDiagram from './MotorcycleDiagram.vue'
import { getPhotoSlotByItemId } from '@/data/verification/photo-slots'

const props = defineProps<{
  label: string
  /** When this belongs to the 車身外觀 photo checklist, shows the shared
   * motorcycle silhouette with THIS exact photo's own position highlighted
   * (not just its Capture Map group's broader region) instead of a generic
   * icon — every one of the 20 appearance items gets its own target. */
  itemId?: string
}>()

const photoSlot = computed(() => (props.itemId ? getPhotoSlotByItemId(props.itemId) : undefined))

const highlight = computed(() => {
  const slot = photoSlot.value
  return slot ? [{ id: slot.id, label: slot.label, ...slot.highlight }] : []
})
</script>

<template>
  <div class="photo-guide">
    <div v-if="photoSlot" class="frame diagram-frame">
      <MotorcycleDiagram :highlights="highlight" />
    </div>
    <div v-else class="frame">
      <Bike :size="40" color="var(--color-text-disabled)" />
    </div>
    <p>請讓{{ label }}完整入框</p>
  </div>
</template>

<style scoped>
.photo-guide {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-lg);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-background);
}

.frame {
  width: 100%;
  height: 140px;
  border: 2px dashed var(--color-text-disabled);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface);
}

.diagram-frame {
  padding: var(--space-sm) var(--space-md);
}

.photo-guide p {
  font-size: 12px;
  color: var(--color-text-secondary);
  text-align: center;
}
</style>
