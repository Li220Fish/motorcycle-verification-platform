<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <div class="report-section">
    <h3>{{ title }}</h3>
    <div class="section-body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.report-section {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: var(--space-md);
}

.report-section h3 {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: var(--space-sm);
}

.section-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
</style>
