<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Bell, Bluetooth, Plus, QrCode, ShieldCheck } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import AppHeader from '@/components/common/AppHeader.vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import VerificationCard from '@/components/common/VerificationCard.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useVehicleStore } from '@/stores/vehicle.store'

const authStore = useAuthStore()
const vehicleStore = useVehicleStore()
const router = useRouter()

// MOCK: there is no cross-vehicle "recent verifications" query yet — verificationStore
// only fetches by a single vehicleId (see src/services/firebase/verification.service.ts).
// Replace this with a real service call once a home-feed query exists.
const recentVerifications = [
  {
    title: 'YAMAHA 勁戰六代',
    subtitle: '2021 · 18,650 km',
    date: '2026/08/20 14:30',
    statusLabel: '已完成',
    statusTone: 'success' as const,
  },
  {
    title: 'KYMCO KRV 180',
    subtitle: '2022 · 7,200 km',
    date: '2026/08/25 10:15',
    statusLabel: '買家複驗',
    statusTone: 'primary' as const,
  },
]

const quickActions = [
  { icon: Plus, label: '新增車輛', to: '/vehicles' },
  { icon: ShieldCheck, label: '開始驗證', to: '/verification' },
  { icon: Bluetooth, label: '連接 Probe', to: '/probe' },
  { icon: QrCode, label: '掃描 QR Code', to: null },
]

function handleQuickAction(to: string | null): void {
  if (to) {
    router.push(to)
  }
}

const vehicleCount = computed(() => vehicleStore.vehicles.length)

onMounted(() => {
  vehicleStore.fetchVehicles()
})
</script>

<template>
  <div>
    <AppHeader title="首頁">
      <template #right>
        <button class="icon-button" aria-label="Notifications">
          <Bell :size="20" />
        </button>
      </template>
    </AppHeader>

    <div class="content">
      <div class="greeting">
        <h2>你好，{{ authStore.user?.displayName || '騎士' }}！</h2>
        <p>今天也來確認重要的車況吧</p>
      </div>

      <div class="hero-card">
        <div>
          <p class="hero-label">我的車輛</p>
          <p class="hero-count">{{ vehicleCount }}</p>
        </div>
        <PrimaryButton variant="secondary" @click="router.push('/vehicles')"
          >查看全部</PrimaryButton
        >
      </div>

      <h3 class="section-title">快速功能</h3>
      <div class="quick-actions">
        <button
          v-for="action in quickActions"
          :key="action.label"
          class="quick-action"
          :disabled="!action.to"
          @click="handleQuickAction(action.to)"
        >
          <component :is="action.icon" :size="22" color="var(--color-primary)" />
          <span>{{ action.label }}</span>
        </button>
      </div>

      <h3 class="section-title">最新驗證紀錄</h3>
      <div class="verification-list">
        <VerificationCard
          v-for="item in recentVerifications"
          :key="item.title + item.date"
          v-bind="item"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  border-radius: var(--radius-sm);
}

.content {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.greeting h2 {
  font-size: 22px;
  font-weight: 700;
}

.greeting p {
  color: var(--color-text-secondary);
  font-size: 14px;
  margin-top: 2px;
}

.hero-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-lg);
  border-radius: var(--radius-xl);
  background: linear-gradient(135deg, var(--color-primary), #1454bd);
  color: #fff;
  box-shadow: var(--shadow-card);
}

.hero-label {
  font-size: 13px;
  opacity: 0.85;
}

.hero-count {
  font-size: 32px;
  font-weight: 700;
  margin-top: 2px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-sm);
}

.quick-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-md) var(--space-xs);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 12px;
  color: var(--color-text-primary);
  font-weight: 600;
}

.quick-action:disabled {
  opacity: 0.45;
}

.verification-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
</style>
