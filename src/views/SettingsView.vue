<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  Bell,
  Bluetooth,
  ChevronRight,
  Info,
  LogOut,
  Repeat,
  Shield,
  User as UserIcon,
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import AppHeader from '@/components/common/AppHeader.vue'
import RoleSwitcher from '@/components/home/RoleSwitcher.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useUserPreferenceStore } from '@/stores/user-preference.store'
import type { UserUsageRole } from '@/types/user-preference'

const authStore = useAuthStore()
const preferenceStore = useUserPreferenceStore()
const router = useRouter()

const noticeMessage = ref('')
const roleSwitcherOpen = ref(false)

const ROLE_LABEL: Record<UserUsageRole, string> = {
  buyer: '買家',
  seller: '賣家',
  professional_seller: '專業賣家',
}
const currentRoleLabel = computed(() =>
  preferenceStore.currentRole ? ROLE_LABEL[preferenceStore.currentRole] : '尚未選擇',
)

interface SettingSection {
  icon: typeof UserIcon
  label: string
  to: string | null
  trailing?: string
  action?: () => void
}

const sections = computed<SettingSection[]>(() => [
  { icon: UserIcon, label: '帳號', to: null },
  {
    icon: Repeat,
    label: '使用模式',
    to: null,
    trailing: currentRoleLabel.value,
    action: () => {
      roleSwitcherOpen.value = true
    },
  },
  { icon: Bell, label: '通知', to: null },
  { icon: Bluetooth, label: 'Probe 連接', to: '/probe' },
  { icon: Shield, label: '資料與隱私', to: null },
  { icon: Info, label: '關於 MotoVerify', to: null },
])

function handleSectionClick(section: SettingSection): void {
  if (section.action) {
    section.action()
    return
  }
  if (section.to) {
    router.push(section.to)
    return
  }
  noticeMessage.value = `「${section.label}」尚未開放設定`
  setTimeout(() => {
    noticeMessage.value = ''
  }, 2000)
}

async function handleSelectRole(role: UserUsageRole): Promise<void> {
  if (!authStore.user) return
  await preferenceStore.setRole(authStore.user.id, role)
}

async function handleLogout(): Promise<void> {
  await authStore.logout()
  router.push('/login')
}

onMounted(async () => {
  if (authStore.user) await preferenceStore.load(authStore.user.id)
})
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
          @click="handleSectionClick(item)"
        >
          <component :is="item.icon" :size="18" color="var(--color-text-secondary)" />
          <span>{{ item.label }}</span>
          <span v-if="item.trailing" class="trailing">{{ item.trailing }}</span>
          <ChevronRight :size="18" color="var(--color-text-disabled)" />
        </button>
      </div>

      <p v-if="noticeMessage" class="notice">{{ noticeMessage }}</p>

      <button class="logout-row" @click="handleLogout">
        <LogOut :size="18" />
        <span>登出</span>
      </button>
    </div>

    <RoleSwitcher
      v-if="preferenceStore.currentRole"
      :open="roleSwitcherOpen"
      :current-role="preferenceStore.currentRole"
      @select="handleSelectRole"
      @close="roleSwitcherOpen = false"
    />
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

.trailing {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
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
