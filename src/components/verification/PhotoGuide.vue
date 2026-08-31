<script setup lang="ts">
import { computed } from 'vue'
import { Bike } from 'lucide-vue-next'

import MotorcycleDiagram from './MotorcycleDiagram.vue'
import { getAppearanceGroup, getAppearanceGroupId } from '@/data/verification/appearance-groups'

const props = defineProps<{
  label: string
  /** When this belongs to the 車身外觀 photo checklist, shows the shared
   * motorcycle silhouette with THIS part's region highlighted instead of a
   * generic icon — every appearance item no longer shares one indistinct
   * picture (P1 §10 of the UX report). */
  itemId?: string
}>()

const appearanceGroup = computed(() => {
  const groupId = props.itemId ? getAppearanceGroupId(props.itemId) : null
  return groupId ? getAppearanceGroup(groupId) : null
})

const highlight = computed(() => {
  const group = appearanceGroup.value
  return group ? [{ id: group.id, label: group.label, ...group.highlight }] : []
})
</script>

<template>
  <div class="photo-guide">
    <div v-if="appearanceGroup" class="frame diagram-frame">
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
