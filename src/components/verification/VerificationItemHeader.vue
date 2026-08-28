<script setup lang="ts">
import StatusBadge from '@/components/common/StatusBadge.vue'

defineProps<{
  title: string
  description: string
  instruction?: string
  severity?: 'normal' | 'important' | 'critical'
}>()
</script>

<template>
  <div class="item-header">
    <div class="title-row">
      <div class="title-main">
        <h2>{{ title }}</h2>
        <StatusBadge v-if="severity === 'critical'" tone="danger">重要</StatusBadge>
        <StatusBadge v-else-if="severity === 'important'" tone="warning">注意</StatusBadge>
      </div>
      <slot />
    </div>
    <p class="description">{{ description }}</p>
    <p v-if="instruction" class="instruction">{{ instruction }}</p>
  </div>
</template>

<style scoped>
.item-header {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.title-main {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
}

.title-row h2 {
  font-size: 17px;
  font-weight: 700;
}

.description {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.instruction {
  font-size: 12px;
  color: var(--color-primary);
  font-weight: 600;
}
</style>
