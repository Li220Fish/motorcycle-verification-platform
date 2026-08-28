<script setup lang="ts">
import { Bike } from 'lucide-vue-next'

import StatusBadge from './StatusBadge.vue'

defineProps<{
  title: string
  subtitle?: string
  date?: string
  statusLabel: string
  statusTone?: 'success' | 'warning' | 'primary' | 'neutral'
}>()
</script>

<template>
  <div class="verification-card">
    <div class="thumb">
      <Bike :size="24" color="var(--color-text-disabled)" />
    </div>
    <div class="info">
      <p class="title">{{ title }}</p>
      <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
      <p v-if="date" class="date">{{ date }}</p>
    </div>
    <StatusBadge :tone="statusTone ?? 'neutral'">{{ statusLabel }}</StatusBadge>
  </div>
</template>

<style scoped>
.verification-card {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.thumb {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  background: var(--color-background);
  display: flex;
  align-items: center;
  justify-content: center;
}

.info {
  flex: 1;
  min-width: 0;
}

.title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.subtitle,
.date {
  font-size: 12px;
  color: var(--color-text-secondary);
}
</style>
