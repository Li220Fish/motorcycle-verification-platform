<script setup lang="ts">
withDefaults(defineProps<{ name: string; photoUrl?: string | null; size?: number }>(), {
  photoUrl: null,
  size: 40,
})

function initials(name: string): string {
  return (name.trim()[0] ?? '?').toUpperCase()
}
</script>

<template>
  <img
    v-if="photoUrl"
    :src="photoUrl"
    class="avatar avatar-img"
    :style="{ width: `${size}px`, height: `${size}px` }"
    alt=""
  />
  <span
    v-else
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

.avatar-img {
  object-fit: cover;
}
</style>
