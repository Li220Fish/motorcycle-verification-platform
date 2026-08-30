<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Bike, FolderCheck, ShieldCheck, Wallet } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import HomeHero from './HomeHero.vue'
import QuickActionGrid from './QuickActionGrid.vue'
import type { QuickAction } from './QuickActionGrid.vue'
import SellerVehicleCard from './SellerVehicleCard.vue'
import { getFlatItems } from '@/data/verification'
import { verificationService } from '@/services/firebase/verification.service'
import { useVehicleStore } from '@/stores/vehicle.store'
import type { Vehicle } from '@/types/vehicle'

const router = useRouter()
const vehicleStore = useVehicleStore()

interface VehicleWithProgress {
  vehicle: Vehicle
  percent: number | null
  verificationId: string | null
}

const vehiclesWithProgress = ref<VehicleWithProgress[]>([])
const loadingProgress = ref(false)

const SELLER_TOTAL = getFlatItems('seller').length

async function loadVehicleProgress(): Promise<void> {
  loadingProgress.value = true
  try {
    // Bounded to the 3 most recently updated vehicles — Home is an overview,
    // not the full garage (see VehiclesView for that).
    const targets = [...vehicleStore.vehicles].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3)

    const entries = await Promise.all(
      targets.map(async (vehicle): Promise<VehicleWithProgress> => {
        try {
          const verifications = await verificationService.listByVehicle(vehicle.id)
          const active = verifications.find((v) => v.type === 'seller' && v.status !== 'completed')
          if (!active) return { vehicle, percent: null, verificationId: null }
          const answers = await verificationService.listAnswers(active.id)
          const percent = Math.round((answers.length / SELLER_TOTAL) * 100)
          return { vehicle, percent, verificationId: active.id }
        } catch {
          return { vehicle, percent: null, verificationId: null }
        }
      }),
    )
    vehiclesWithProgress.value = entries
  } finally {
    loadingProgress.value = false
  }
}

onMounted(async () => {
  if (vehicleStore.vehicles.length === 0) await vehicleStore.fetchVehicles()
  await loadVehicleProgress()
})

function handleStartVerification(): void {
  if (vehicleStore.vehicles.length === 0) {
    router.push('/vehicles')
  } else {
    // type=seller: arriving from this CTA already answers "which type?" —
    // VerificationView skips its buyer/seller picker when it sees this.
    router.push('/verification?type=seller')
  }
}

const actions: QuickAction[] = [
  { icon: Bike, label: '我的車輛', to: '/vehicles' },
  { icon: ShieldCheck, label: '開始驗證', to: '/verification?type=seller' },
  { icon: FolderCheck, label: '驗證報告', to: '/reports' },
  { icon: Wallet, label: '交易管理', to: null },
]

const hasVehicles = computed(() => vehicleStore.vehicles.length > 0)
</script>

<template>
  <div class="seller-home">
    <HomeHero
      role="seller"
      brand="MotoVerify"
      :title="['讓好車', '更容易被相信']"
      description="建立一份有證據的車況驗證紀錄。"
      primary-label="📷 開始車況驗證"
      secondary-label="管理我的車輛"
      @primary="handleStartVerification"
      @secondary="router.push('/vehicles')"
    />

    <div class="section">
      <QuickActionGrid :actions="actions" />
    </div>

    <div class="section">
      <div class="section-header">
        <h2>我的車輛</h2>
        <RouterLink to="/vehicles" class="see-all">查看全部 →</RouterLink>
      </div>
      <div v-if="hasVehicles" class="vehicle-list">
        <SellerVehicleCard
          v-for="entry in vehiclesWithProgress"
          :key="entry.vehicle.id"
          :vehicle="entry.vehicle"
          :percent="entry.percent"
          :verification-id="entry.verificationId"
        />
      </div>
      <div v-else class="empty-state">
        <p>還沒有車輛，新增第一台開始驗證吧。</p>
        <button class="add-vehicle-btn" @click="router.push('/vehicles')">新增車輛</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.seller-home {
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

.section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.section-header h2 {
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text-primary);
  margin: 0;
}

.see-all {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--color-primary);
  text-decoration: none;
}

.vehicle-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.empty-state {
  padding: var(--space-lg);
  background: var(--color-surface);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  align-items: center;
}

.empty-state p {
  font-size: 13.5px;
  color: var(--color-text-secondary);
  margin: 0;
}

.add-vehicle-btn {
  height: 40px;
  padding: 0 20px;
  border-radius: var(--radius-sm);
  border: none;
  background: var(--color-primary);
  color: #fff;
  font-size: 13.5px;
  font-weight: 700;
}
</style>
