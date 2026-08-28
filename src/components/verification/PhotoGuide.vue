<script setup lang="ts">
import { Bike } from 'lucide-vue-next'

defineProps<{
  label: string
}>()
</script>

<template>
  <div class="photo-guide">
    <div class="frame">
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

.photo-guide p {
  font-size: 12px;
  color: var(--color-text-secondary);
  text-align: center;
}
</style>
