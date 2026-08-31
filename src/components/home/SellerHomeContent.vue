<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import MyListingsSection from './MyListingsSection.vue'
import VehicleCarousel from './VehicleCarousel.vue'
import VehicleNewsSection from './VehicleNewsSection.vue'
import VehicleStatusCard from './VehicleStatusCard.vue'
import { getFlatItems } from '@/data/verification'
import { homeContentService } from '@/services/firebase/home-content.service'
import { verificationService } from '@/services/firebase/verification.service'
import { useVehicleStore } from '@/stores/vehicle.store'
import type { MockMarketListing } from '@/data/home/marketplace-mock'
import type { Vehicle } from '@/types/vehicle'

const vehicleStore = useVehicleStore()
const marketListings = ref<MockMarketListing[]>([])

interface VehicleWithProgress {
  vehicle: Vehicle
  percent: number | null
  verificationId: string | null
  hasCompletedVerification: boolean
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
          const hasCompletedVerification = verifications.some(
            (v) => v.type === 'seller' && v.status === 'completed',
          )
          const active = verifications.find((v) => v.type === 'seller' && v.status !== 'completed')
          if (!active)
            return { vehicle, percent: null, verificationId: null, hasCompletedVerification }
          const answers = await verificationService.listAnswers(active.id)
          const percent = Math.round((answers.length / SELLER_TOTAL) * 100)
          return { vehicle, percent, verificationId: active.id, hasCompletedVerification }
        } catch {
          return { vehicle, percent: null, verificationId: null, hasCompletedVerification: false }
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
  await Promise.all([
    loadVehicleProgress(),
    homeContentService.listMarketplaceListings().then((listings) => {
      marketListings.value = listings
    }),
  ])
})

// Most recently updated vehicle — featured on the Home "我的車輛" status
// card, matching the Reference prototype's single-vehicle summary widget.
const featuredVehicle = computed(() => vehiclesWithProgress.value[0] ?? null)
const featuredStatusLabel = computed(() => {
  const entry = featuredVehicle.value
  if (!entry) return ''
  if (entry.hasCompletedVerification) return '狀態良好'
  if (entry.percent !== null) return '驗證中'
  return '尚未驗證'
})

const hasVehicles = computed(() => vehicleStore.vehicles.length > 0)
</script>

<template>
  <div class="seller-home">
    <!-- The status card IS the Home hero now — no separate marketing banner.
         It renders its own empty state when there's no vehicle yet. -->
    <div class="section">
      <VehicleStatusCard
        :vehicle="featuredVehicle?.vehicle ?? null"
        :status-label="featuredStatusLabel"
      />
    </div>

    <div class="section">
      <div class="section-header">
        <h2>為你推薦</h2>
        <RouterLink to="/marketplace" class="see-all">查看全部 →</RouterLink>
      </div>
      <VehicleCarousel :listings="marketListings" />
    </div>

    <MyListingsSection v-if="hasVehicles" />

    <VehicleNewsSection />
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
</style>
