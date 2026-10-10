<script setup lang="ts">
import { computed } from 'vue'
import { MessageCircle, Home, ShieldCheck, ShoppingBag, Users } from 'lucide-vue-next'
import { RouterLink, useRoute } from 'vue-router'

import { useI18n } from '@/composables/useI18n'
import { useChatStore } from '@/stores/chat.store'

const route = useRoute()
const chatStore = useChatStore()
const { t } = useI18n()

const items = computed(() => [
  { path: '/dashboard', label: t('nav', 'home'), icon: Home },
  { path: '/marketplace', label: t('nav', 'market'), icon: ShoppingBag },
  { path: '/verification', label: t('nav', 'verify'), icon: ShieldCheck },
  { path: '/messages', label: t('nav', 'messages'), icon: MessageCircle, badge: true },
  { path: '/discussion', label: t('nav', 'discussion'), icon: Users },
])

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
      <span class="icon-wrap">
        <component :is="item.icon" :size="21" />
        <span v-if="item.badge && chatStore.unreadTotal > 0" class="badge">
          {{ chatStore.unreadTotal > 99 ? '99+' : chatStore.unreadTotal }}
        </span>
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
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  padding: 8px 6px max(8px, var(--safe-area-inset-bottom, env(safe-area-inset-bottom)));
  z-index: 20;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  text-decoration: none;
  color: var(--color-text-disabled);
  font-size: 10.5px;
  font-weight: 700;
  padding: 4px 0;
  position: relative;
}

.nav-item.active {
  color: var(--color-primary);
}

.icon-wrap {
  position: relative;
  display: flex;
}

.badge {
  position: absolute;
  top: -6px;
  right: -10px;
  min-width: 16px;
  height: 16px;
  padding: 0 3px;
  border-radius: 999px;
  background: var(--color-danger);
  color: #fff;
  font-size: 9.5px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
