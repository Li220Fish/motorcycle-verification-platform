<script setup lang="ts">
withDefaults(defineProps<{ name: string; size?: number }>(), { size: 40 })

function initials(name: string): string {
  return (name.trim()[0] ?? '?').toUpperCase()
}
</script>

<template>
  <span
    class="avatar"
    :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.34)}px` }"
  >
    {{ initials(name) }}
  </span>
</template>

<style scoped>
.avatar {
  flex-shrink: 0;
  border-radius: 999px;
  background: var(--color-primary-bg);
  color: var(--color-primary);
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  text-transform: uppercase;
}
</style>
