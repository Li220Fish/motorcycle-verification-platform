<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { FileText } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import AppHeader from '@/components/common/AppHeader.vue'
import VehicleSearchBar from '@/components/home/VehicleSearchBar.vue'
import { verificationService } from '@/services/firebase/verification.service'
import { useVehicleStore } from '@/stores/vehicle.store'
import type { Vehicle } from '@/types/vehicle'
import type { Verification } from '@/types/verification'

const router = useRouter()
const vehicleStore = useVehicleStore()

interface ReportEntry {
  vehicle: Vehicle
  verification: Verification
}

const reports = ref<ReportEntry[]>([])
const loading = ref(false)

async function loadReports(): Promise<void> {
  loading.value = true
  try {
    if (vehicleStore.vehicles.length === 0) await vehicleStore.fetchVehicles()
    const targets = [...vehicleStore.vehicles]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 20)

    const entries = await Promise.all(
      targets.map(async (vehicle) => {
        try {
          const verifications = await verificationService.listByVehicle(vehicle.id)
          return verifications
            .filter((v) => v.type === 'seller' && v.status === 'completed')
            .map((verification) => ({ vehicle, verification }))
        } catch {
          return []
        }
      }),
    )
    reports.value = entries.flat()
  } finally {
    loading.value = false
  }
}

onMounted(loadReports)
</script>

<template>
  <div>
    <AppHeader title="驗證報告" />

    <div class="content">
      <p class="hint">輸入車牌或車身號碼，查看該車輛的驗證報告。</p>
      <VehicleSearchBar />

      <h2 class="section-title">我的驗證報告</h2>
      <p v-if="loading" class="loading">載入中...</p>
      <div v-else-if="reports.length === 0" class="empty">
        <p>目前沒有已完成的驗證報告。</p>
      </div>
      <div v-else class="report-list">
        <button
          v-for="entry in reports"
          :key="entry.verification.id"
          class="report-row"
          @click="router.push(`/verification/${entry.verification.id}/report`)"
        >
          <span class="thumb"><FileText :size="20" color="var(--color-text-disabled)" /></span>
          <span class="info">
            <span class="title">{{ entry.vehicle.brand }} {{ entry.vehicle.model }}</span>
            <span class="sub">{{
              entry.vehicle.licensePlate ?? entry.vehicle.manufactureYear
            }}</span>
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.content {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.hint {
  font-size: 13.5px;
  color: var(--color-text-secondary);
  margin: 0;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: var(--space-sm) 0 0;
}

.loading,
.empty {
  text-align: center;
  color: var(--color-text-disabled);
  font-size: 13.5px;
  padding: var(--space-lg) 0;
}

.report-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.report-row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  text-align: left;
}

.thumb {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  background: var(--color-background);
  display: flex;
  align-items: center;
  justify-content: center;
}

.info {
  display: flex;
  flex-direction: column;
}

.title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.sub {
  font-size: 12px;
  color: var(--color-text-secondary);
}
</style>
