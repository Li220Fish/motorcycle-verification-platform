<script setup lang="ts">
import { FileText, Home, ShieldCheck, ShoppingBag, User } from 'lucide-vue-next'
import { RouterLink, RouterView, useRoute } from 'vue-router'

import BottomNavigation from '@/components/common/BottomNavigation.vue'
import Logo from '@/components/common/Logo.vue'
import { useUserPreferenceStore } from '@/stores/user-preference.store'

const route = useRoute()
const preferenceStore = useUserPreferenceStore()

const navItems = [
  { path: '/dashboard', label: '首頁', icon: Home },
  { path: '/marketplace', label: '市場', icon: ShoppingBag },
  { path: '/verification', label: '驗證', icon: ShieldCheck },
  { path: '/reports', label: '報告', icon: FileText },
  { path: '/settings', label: '我的', icon: User },
]

function isActive(path: string): boolean {
  return route.path === path || route.path.startsWith(`${path}/`)
}

function showChrome(): boolean {
  if (route.meta.requiresAuth === false || route.meta.hideChrome === true) return false
  // Home doubles as the first-run Role Selection gate (§4 of the Home
  // redesign spec) — that screen is a decision point, not a navigable page,
  // so the nav shouldn't invite the user into Marketplace/Verification/etc.
  // before any role-based content exists yet.
  if (route.path === '/dashboard' && !preferenceStore.hasSelectedRole) return false
  return true
}
</script>

<template>
  <div class="app-shell">
    <aside v-if="showChrome()" class="app-sidebar">
      <div class="sidebar-logo">
        <Logo />
      </div>
      <nav class="sidebar-nav">
        <RouterLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="sidebar-link"
          :class="{ active: isActive(item.path) }"
        >
          <component :is="item.icon" :size="20" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>
    </aside>

    <main class="app-main" :class="{ 'full-bleed': !showChrome() }">
      <RouterView />
    </main>

    <BottomNavigation v-if="showChrome()" class="mobile-only" />
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  min-height: 100vh;
  background: var(--color-background);
}

.app-sidebar {
  width: 220px;
  flex-shrink: 0;
  display: none;
  flex-direction: column;
  gap: var(--space-lg);
  padding: var(--space-lg) var(--space-md);
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
}

.sidebar-logo {
  padding: 0 var(--space-sm);
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 10px var(--space-sm);
  border-radius: var(--radius-sm);
  text-decoration: none;
  color: var(--color-text-secondary);
  font-size: 14px;
  font-weight: 600;
}

.sidebar-link.active {
  color: var(--color-primary);
  background: #e8f1fd;
}

.app-main {
  flex: 1;
  min-width: 0;
  padding-bottom: calc(var(--bottom-nav-height) + env(safe-area-inset-bottom));
}

.app-main.full-bleed {
  padding-bottom: 0;
}

.mobile-only {
  display: flex;
}

@media (min-width: 768px) {
  .app-sidebar {
    display: flex;
  }

  .app-main {
    padding-bottom: 0;
  }

  .mobile-only {
    display: none;
  }
}
</style>
