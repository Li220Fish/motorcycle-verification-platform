<script setup lang="ts">
import StatusBadge from '@/components/common/StatusBadge.vue'

defineProps<{
  title: string
  shortDescription?: string
  done: number
  total: number
}>()

defineEmits<{ click: [] }>()
</script>

<template>
  <button class="section-card" @click="$emit('click')">
    <div class="text">
      <p class="title">{{ title }}</p>
      <p v-if="shortDescription" class="description">{{ shortDescription }}</p>
    </div>
    <StatusBadge :tone="done === total ? 'success' : 'warning'">
      {{ done === total ? '✓' : '⚠' }} {{ done }} / {{ total }}
    </StatusBadge>
  </button>
</template>

<style scoped>
.section-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  width: 100%;
  padding: var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  text-align: left;
}

.text {
  min-width: 0;
}

.title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.description {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 2px;
}
</style>
