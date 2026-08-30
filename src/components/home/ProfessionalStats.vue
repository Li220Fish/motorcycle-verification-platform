<script setup lang="ts">
defineProps<{
  pendingCount: number
  inProgressCount: number
  completedCount: number
  pendingTransactionCount: number
}>()
</script>

<template>
  <div class="stat-grid">
    <div class="stat-card">
      <p class="value">{{ pendingCount }}</p>
      <p class="label">待驗證</p>
    </div>
    <div class="stat-card">
      <p class="value">{{ inProgressCount }}</p>
      <p class="label">驗證中</p>
    </div>
    <div class="stat-card">
      <p class="value">{{ completedCount }}</p>
      <p class="label">已完成</p>
    </div>
    <div class="stat-card">
      <p class="value">{{ pendingTransactionCount }}</p>
      <p class="label">待處理交易</p>
    </div>
  </div>
</template>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-sm);
}

.stat-card {
  padding: var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.value {
  font-size: 26px;
  font-weight: 800;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}

.label {
  font-size: 12.5px;
  color: var(--color-text-secondary);
  font-weight: 600;
  margin-top: 2px;
}
</style>
