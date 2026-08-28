<script setup lang="ts">
import ProgressBar from '@/components/common/ProgressBar.vue'

defineProps<{
  done: number
  total: number
  percent: number
}>()
</script>

<template>
  <div class="progress-block">
    <div class="progress-row">
      <span>{{ done }} / {{ total }}</span>
      <span>{{ percent }}%</span>
    </div>
    <ProgressBar :value="percent" />
  </div>
</template>

<style scoped>
.progress-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
}
</style>
