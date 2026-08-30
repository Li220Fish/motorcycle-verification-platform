<script setup lang="ts">
import { FileText, Home, ShieldCheck, ShoppingBag, User } from 'lucide-vue-next'
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()

const items = [
  { path: '/dashboard', label: '首頁', icon: Home },
  { path: '/marketplace', label: '市場', icon: ShoppingBag },
  { path: '/verification', label: '驗證', icon: ShieldCheck, raised: true },
  { path: '/reports', label: '報告', icon: FileText },
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
      :class="{ active: isActive(item.path), raised: item.raised }"
    >
      <span class="icon-wrap">
        <component :is="item.icon" :size="item.raised ? 22 : 22" />
      </span>
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
  align-items: flex-end;
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

.nav-item.raised .icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 999px;
  background: var(--color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: -18px;
  box-shadow: 0 4px 12px rgba(23, 105, 232, 0.35);
}

.nav-item.raised span:last-child {
  margin-top: 2px;
}
</style>
