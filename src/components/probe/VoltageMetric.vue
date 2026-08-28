<script setup lang="ts">
defineProps<{
  label: string
  value: string
}>()
</script>

<template>
  <div class="metric">
    <p class="metric-label">{{ label }}</p>
    <p class="metric-value">{{ value }}</p>
  </div>
</template>

<style scoped>
.metric {
  flex: 1;
  text-align: center;
}

.metric-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 2px;
}

.metric-value {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}
</style>
