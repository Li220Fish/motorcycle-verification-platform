<script setup lang="ts">
withDefaults(
  defineProps<{
    tone?: 'success' | 'warning' | 'danger' | 'neutral' | 'primary'
  }>(),
  { tone: 'neutral' },
)
</script>

<template>
  <span class="badge" :class="tone"><slot /></span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.success {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.warning {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}

.danger {
  background: var(--color-danger-bg);
  color: var(--color-danger);
}

.primary {
  background: #e8f1fd;
  color: var(--color-primary);
}

.neutral {
  background: #f1f2f4;
  color: var(--color-text-secondary);
}
</style>
