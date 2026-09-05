<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
  <div class="divider">
    <span>{{ label }}</span>
  </div>
</template>

<style scoped>
.divider {
  display: flex;
  justify-content: center;
  margin: 6px 0;
}

.divider span {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-disabled);
  background: var(--color-background);
  padding: 3px 12px;
  border-radius: 999px;
}
</style>
