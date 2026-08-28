<script setup lang="ts">
import { Bike, Bluetooth, Home, ShieldCheck, User } from 'lucide-vue-next'
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()

const items = [
  { path: '/dashboard', label: '首頁', icon: Home },
  { path: '/vehicles', label: '車輛', icon: Bike },
  { path: '/verification', label: '驗證', icon: ShieldCheck },
  { path: '/probe', label: 'Probe', icon: Bluetooth },
  { path: '/settings', label: '我的', icon: User },
]

function isActive(path: string): boolean {
  return route.path === path || route.path.startsWith(`${path}/`)
}
</script>

<template>
  <nav class="bottom-nav">
    <RouterLink
      v-for="item in items"
      :key="item.path"
      :to="item.path"
      class="nav-item"
      :class="{ active: isActive(item.path) }"
    >
      <component :is="item.icon" :size="22" />
      <span>{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  padding-top: 6px;
  padding-bottom: max(6px, env(safe-area-inset-bottom));
  z-index: 20;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  text-decoration: none;
  color: var(--color-text-disabled);
  font-size: 11px;
  padding: 4px 12px;
}

.nav-item.active {
  color: var(--color-primary);
}
</style>
