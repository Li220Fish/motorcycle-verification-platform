<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Bike, FolderCheck, PlusCircle, Wallet } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import HomeHero from './HomeHero.vue'
import ProfessionalStats from './ProfessionalStats.vue'
import QuickActionGrid from './QuickActionGrid.vue'
import type { QuickAction } from './QuickActionGrid.vue'
import { verificationService } from '@/services/firebase/verification.service'
import { useVehicleStore } from '@/stores/vehicle.store'

const router = useRouter()
const vehicleStore = useVehicleStore()

const pendingCount = ref(0)
const inProgressCount = ref(0)
const completedCount = ref(0)
// No transaction backend exists yet (§18/§41 of the Home redesign spec) —
// shown honestly as 0 rather than faked, pending a real Transaction model.
const pendingTransactionCount = ref(0)

async function loadStats(): Promise<void> {
  if (vehicleStore.vehicles.length === 0) await vehicleStore.fetchVehicles()
  // Bounded to the 30 most recently updated vehicles to keep this an
  // overview stat, not an unbounded full-inventory scan on every Home visit.
  const targets = [...vehicleStore.vehicles].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 30)

  let pending = 0
  let inProgress = 0
  let completed = 0

  await Promise.all(
    targets.map(async (vehicle) => {
      try {
        const verifications = await verificationService.listByVehicle(vehicle.id)
        const sellerVerifications = verifications.filter((v) => v.type === 'seller')
        if (sellerVerifications.length === 0) {
          pending += 1
          return
        }
        if (sellerVerifications.some((v) => v.status === 'completed')) {
          completed += 1
        } else {
          inProgress += 1
        }
      } catch {
        // best-effort aggregate — skip vehicles whose verification list fails to load
      }
    }),
  )

  pendingCount.value = pending
  inProgressCount.value = inProgress
  completedCount.value = completed
}

onMounted(loadStats)

const actions: QuickAction[] = [
  { icon: Bike, label: '車輛管理', to: '/vehicles' },
  { icon: PlusCircle, label: '新增驗證', to: '/verification?type=seller' },
  { icon: FolderCheck, label: '報告管理', to: '/reports' },
  { icon: Wallet, label: '交易管理', to: null },
]
</script>

<template>
  <div class="pro-home">
    <HomeHero
      role="professional_seller"
      brand="MotoVerify Pro"
      :title="['讓每一台車', '都有可信的車況資料']"
      description="批量管理、驗證與交易紀錄。"
      primary-label="新增待售車輛"
      secondary-label="查看車輛管理"
      @primary="router.push('/vehicles')"
      @secondary="router.push('/vehicles')"
    />

    <div class="section">
      <h2>今日概況</h2>
      <ProfessionalStats
        :pending-count="pendingCount"
        :in-progress-count="inProgressCount"
        :completed-count="completedCount"
        :pending-transaction-count="pendingTransactionCount"
      />
    </div>

    <div class="section">
      <QuickActionGrid :actions="actions" />
    </div>
  </div>
</template>

<style scoped>
.pro-home {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  padding-bottom: var(--space-lg);
}

.section {
  padding: 0 var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.section h2 {
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text-primary);
  margin: 0;
}
</style>
