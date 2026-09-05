<script setup lang="ts">
import { Bike, MoreHorizontal } from 'lucide-vue-next'

import StatusBadge from './StatusBadge.vue'
import type { Vehicle } from '@/types/vehicle'

defineProps<{
  vehicle: Vehicle
  badge?: string
}>()

defineEmits<{ more: [] }>()
</script>

<template>
  <div class="vehicle-card">
    <div class="thumb">
      <img v-if="vehicle.photos[0]" :src="vehicle.photos[0]" class="thumb-img" alt="" />
      <Bike v-else :size="32" color="var(--color-text-disabled)" />
    </div>
    <div class="info">
      <p class="brand">{{ vehicle.brand }}</p>
      <p class="model">{{ vehicle.model }}</p>
      <p class="meta">
        <span v-if="vehicle.manufactureYear">{{ vehicle.manufactureYear }} 年式</span>
        <span v-if="vehicle.mileage !== null"
          >{{ vehicle.manufactureYear ? ' · ' : ''
          }}{{ vehicle.mileage?.toLocaleString() }} km</span
        >
      </p>
      <StatusBadge v-if="badge" tone="primary">{{ badge }}</StatusBadge>
    </div>
    <button class="more-button" aria-label="More" @click.stop="$emit('more')">
      <MoreHorizontal :size="18" />
    </button>
  </div>
</template>

<style scoped>
.vehicle-card {
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
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  background: var(--color-background);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.model {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.meta {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}

.more-button {
  border: none;
  background: transparent;
  color: var(--color-text-disabled);
  padding: var(--space-xs);
  flex-shrink: 0;
}
</style>
