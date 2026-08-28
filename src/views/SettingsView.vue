<script setup lang="ts">
import { ref } from 'vue'
import {
  Bell,
  Bluetooth,
  ChevronRight,
  Info,
  LogOut,
  Shield,
  User as UserIcon,
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import AppHeader from '@/components/common/AppHeader.vue'
import { useAuthStore } from '@/stores/auth.store'

const authStore = useAuthStore()
const router = useRouter()

const noticeMessage = ref('')

const sections = [
  { icon: UserIcon, label: '帳號' },
  { icon: Bell, label: '通知' },
  { icon: Bluetooth, label: 'Probe' },
  { icon: Shield, label: '資料與隱私' },
  { icon: Info, label: '關於 MotoVerify' },
]

function handleSectionClick(label: string): void {
  noticeMessage.value = `「${label}」尚未開放設定`
  setTimeout(() => {
    noticeMessage.value = ''
  }, 2000)
}

async function handleLogout(): Promise<void> {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div>
    <AppHeader title="我的" />

    <div class="content">
      <div class="user-card">
        <div class="avatar">
          {{ (authStore.user?.displayName || authStore.user?.email || '?')[0] }}
        </div>
        <div>
          <p class="name">{{ authStore.user?.displayName || '未命名使用者' }}</p>
          <p class="email">{{ authStore.user?.email }}</p>
        </div>
      </div>

      <div class="section-list">
        <button
          v-for="item in sections"
          :key="item.label"
          class="section-row"
          @click="handleSectionClick(item.label)"
        >
          <component :is="item.icon" :size="18" color="var(--color-text-secondary)" />
          <span>{{ item.label }}</span>
          <ChevronRight :size="18" color="var(--color-text-disabled)" />
        </button>
      </div>

      <p v-if="noticeMessage" class="notice">{{ noticeMessage }}</p>

      <button class="logout-row" @click="handleLogout">
        <LogOut :size="18" />
        <span>登出</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.content {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.user-card {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.avatar {
  width: 52px;
  height: 52px;
  border-radius: 999px;
  background: var(--color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  text-transform: uppercase;
  flex-shrink: 0;
}

.name {
  font-size: 16px;
  font-weight: 700;
}

.email {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.section-list {
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.section-row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: left;
}

.section-row:not(:last-child) {
  border-bottom: 1px solid var(--color-border);
}

.section-row span:first-of-type {
  flex: 1;
}

.notice {
  font-size: 13px;
  color: var(--color-text-secondary);
  text-align: center;
}

.logout-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-danger);
  font-weight: 600;
}
</style>
