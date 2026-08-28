<script setup lang="ts">
import { Check } from 'lucide-vue-next'

defineProps<{
  label: string
  status: 'completed' | 'current' | 'pending' | 'locked'
}>()
</script>

<template>
  <div class="step-item" :class="status">
    <span class="step-indicator">
      <Check v-if="status === 'completed'" :size="14" color="#fff" />
    </span>
    <span class="step-label">{{ label }}</span>
  </div>
</template>

<style scoped>
.step-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.step-indicator {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--color-border);
}

.step-label {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.step-item.completed .step-indicator {
  background: var(--color-success);
  border-color: var(--color-success);
}

.step-item.current .step-indicator {
  border-color: var(--color-primary);
}

.step-item.current .step-label {
  color: var(--color-primary);
}

.step-item.pending .step-indicator {
  border-color: var(--color-border);
}

.step-item.pending .step-label {
  color: var(--color-text-secondary);
}

.step-item.locked {
  opacity: 0.5;
}

.step-item.locked .step-label {
  color: var(--color-text-disabled);
}
</style>
