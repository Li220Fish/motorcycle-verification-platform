<script setup lang="ts">
import VerificationCard from '@/components/common/VerificationCard.vue'

export interface ActivityItem {
  title: string
  subtitle?: string
  date?: string
  statusLabel: string
  statusTone?: 'success' | 'warning' | 'primary' | 'neutral'
}

defineProps<{ items: ActivityItem[] }>()
</script>

<template>
  <div class="recent-activity">
    <VerificationCard v-for="item in items" :key="item.title + (item.date ?? '')" v-bind="item" />
    <p v-if="items.length === 0" class="empty">目前沒有最近活動。</p>
  </div>
</template>

<style scoped>
.recent-activity {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.empty {
  font-size: 13px;
  color: var(--color-text-disabled);
  text-align: center;
  padding: var(--space-md) 0;
}
</style>
