<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  icon?: Component
  title: string
  description?: string
}>()
</script>

<template>
  <div class="empty-state">
    <component :is="icon" v-if="icon" :size="40" color="var(--color-text-disabled)" />
    <h3>{{ title }}</h3>
    <p v-if="description">{{ description }}</p>
    <div v-if="$slots.action" class="action">
      <slot name="action" />
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-sm);
  padding: var(--space-xl) var(--space-lg);
  color: var(--color-text-secondary);
}

.empty-state h3 {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.empty-state p {
  font-size: 14px;
  max-width: 280px;
}

.action {
  margin-top: var(--space-sm);
}
</style>
