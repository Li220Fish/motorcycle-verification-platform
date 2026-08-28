<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    value: number
    max?: number
    tone?: 'primary' | 'success'
  }>(),
  { max: 100, tone: 'primary' },
)

function percent(): number {
  return Math.max(0, Math.min(100, (props.value / props.max) * 100))
}
</script>

<template>
  <div class="progress-track">
    <div class="progress-fill" :class="tone" :style="{ width: `${percent()}%` }" />
  </div>
</template>

<style scoped>
.progress-track {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: var(--color-border);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s ease;
}

.progress-fill.primary {
  background: var(--color-primary);
}

.progress-fill.success {
  background: var(--color-success);
}
</style>
