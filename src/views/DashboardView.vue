<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Bell } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import Avatar from '@/components/common/Avatar.vue'
import BuyerHomeContent from '@/components/home/BuyerHomeContent.vue'
import ProfessionalHomeContent from '@/components/home/ProfessionalHomeContent.vue'
import RoleSelection from '@/components/home/RoleSelection.vue'
import SellerHomeContent from '@/components/home/SellerHomeContent.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useUserPreferenceStore } from '@/stores/user-preference.store'
import type { UserUsageRole } from '@/types/user-preference'

const authStore = useAuthStore()
const preferenceStore = useUserPreferenceStore()
const router = useRouter()

const currentRole = computed(() => preferenceStore.currentRole)
const displayName = computed(
  () => authStore.user?.displayName || authStore.user?.email?.split('@')[0] || '朋友',
)

// Reference prototype's Home header always carries a role-flavoured subtitle
// under the greeting — same shell markup for all 3 roles, only this text
// (and the content below) differs, so Header Role Consistency still holds.
const GREETING_SUBTITLE: Record<UserUsageRole, string> = {
  buyer: '今天也來找找喜歡的車吧',
  seller: '今天也來記錄愛車的狀態吧',
  professional_seller: '今天也來管理你的車輛吧',
}
const greetingSubtitle = computed(() =>
  currentRole.value ? GREETING_SUBTITLE[currentRole.value] : '',
)

// No notification backend exists yet — same "disabled + toast" pattern as
// other not-yet-built actions (QuickActionGrid, SettingsView) rather than a
// dead icon or a faked notification panel.
const noticeMessage = ref('')
function handleNotificationClick(): void {
  noticeMessage.value = '通知功能尚未開放'
  setTimeout(() => {
    noticeMessage.value = ''
  }, 2000)
}

async function handleSelectRole(role: UserUsageRole): Promise<void> {
  if (!authStore.user) return
  await preferenceStore.setRole(authStore.user.id, role)
}

onMounted(async () => {
  if (authStore.user) await preferenceStore.load(authStore.user.id)
})
</script>

<template>
  <RoleSelection v-if="!currentRole" @select="handleSelectRole" />

  <div v-else class="home">
    <header class="home-header">
      <button class="greeting" @click="router.push('/settings')">
        <Avatar :name="displayName" :size="40" />
        <span class="greeting-text">
          <span class="greeting-title">你好，{{ displayName }}！</span>
          <span class="greeting-subtitle">{{ greetingSubtitle }}</span>
        </span>
      </button>
      <button class="icon-button" aria-label="通知" @click="handleNotificationClick">
        <Bell :size="20" />
      </button>
    </header>
    <p v-if="noticeMessage" class="notice">{{ noticeMessage }}</p>

    <Transition name="content-fade" mode="out-in">
      <BuyerHomeContent v-if="currentRole === 'buyer'" key="buyer" />
      <SellerHomeContent v-else-if="currentRole === 'seller'" key="seller" />
      <ProfessionalHomeContent v-else key="professional" />
    </Transition>
  </div>
</template>

<style scoped>
/* Bespoke (not the shared AppHeader) — the 2-line greeting+subtitle needs
   more height than AppHeader's fixed single-row shell. Still uses the same
   background/horizontal padding/sticky-top convention, and renders
   identically for all 3 roles (only the text content differs), so Header
   Role Consistency still holds. */
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

.content-fade-enter-active,
.content-fade-leave-active {
  transition: opacity 0.18s ease;
}

.content-fade-enter-from,
.content-fade-leave-to {
  opacity: 0;
}
</style>
