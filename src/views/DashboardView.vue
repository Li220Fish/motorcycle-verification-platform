<script setup lang="ts">
import { computed, ref } from 'vue'
import { Bell } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import Avatar from '@/components/common/Avatar.vue'
import HomeContent from '@/components/home/HomeContent.vue'
import { useAuthStore } from '@/stores/auth.store'

const authStore = useAuthStore()
const router = useRouter()

const displayName = computed(
  () => authStore.user?.displayName || authStore.user?.email?.split('@')[0] || '朋友',
)

// No notification backend exists yet — same "disabled + toast" pattern as
// other not-yet-built actions (SettingsView) rather than a dead icon or a
// faked notification panel.
const noticeMessage = ref('')
function handleNotificationClick(): void {
  noticeMessage.value = '通知功能尚未開放'
  setTimeout(() => {
    noticeMessage.value = ''
  }, 2000)
}
</script>

<template>
  <div class="home">
    <header class="home-header">
      <button class="greeting" @click="router.push('/settings')">
        <Avatar :name="displayName" :size="40" />
        <span class="greeting-text">
          <span class="greeting-title">你好，{{ displayName }}！</span>
          <span class="greeting-subtitle">查驗車況，買賣都安心</span>
        </span>
      </button>
      <button class="icon-button" aria-label="通知" @click="handleNotificationClick">
        <Bell :size="20" />
      </button>
    </header>
    <p v-if="noticeMessage" class="notice">{{ noticeMessage }}</p>

    <HomeContent />
  </div>
</template>

<style scoped>
/* Bespoke (not the shared AppHeader) — the 2-line greeting+subtitle needs
   more height than AppHeader's fixed single-row shell. Still uses the same
   background/horizontal padding/sticky-top convention. */
.home-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  padding: var(--space-md) 18px;
  padding-top: calc(var(--space-md) + env(safe-area-inset-top));
  background: var(--color-background);
  position: sticky;
  top: 0;
  z-index: 10;
}

.greeting {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 0;
  border: none;
  background: transparent;
  padding: 0;
  text-align: left;
}

.greeting-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.greeting-title {
  font-size: 15px;
  font-weight: 800;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.greeting-subtitle {
  font-size: 12px;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.icon-button:active {
  background: var(--color-surface);
}

.notice {
  margin: 0;
  padding: 4px var(--space-md) 0;
  font-size: 12px;
  color: var(--color-text-secondary);
  text-align: center;
}
</style>
