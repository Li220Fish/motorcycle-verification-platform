<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Bike, Plus } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import AppHeader from '@/components/common/AppHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import VehicleCard from '@/components/common/VehicleCard.vue'
import { useVehicleStore } from '@/stores/vehicle.store'
import type { VehicleDraft } from '@/types/vehicle'

const vehicleStore = useVehicleStore()
const router = useRouter()

const showForm = ref(false)
const submitting = ref(false)

const form = reactive<VehicleDraft>({
  brand: '',
  model: '',
  year: null,
  mileage: null,
  licensePlate: '',
})

async function handleCreate(): Promise<void> {
  submitting.value = true
  try {
    await vehicleStore.createVehicle({ ...form })
    form.brand = ''
    form.model = ''
    form.year = null
    form.mileage = null
    form.licensePlate = ''
    showForm.value = false
  } finally {
    submitting.value = false
  }
}

function openVehicle(id: string): void {
  router.push(`/vehicles/${id}`)
}

onMounted(() => {
  vehicleStore.fetchVehicles()
})
</script>

<template>
  <div>
    <AppHeader title="我的車輛">
      <template #right>
        <button class="icon-button" aria-label="新增車輛" @click="showForm = !showForm">
          <Plus :size="20" />
        </button>
      </template>
    </AppHeader>

    <div class="content">
      <form v-if="showForm" class="vehicle-form" @submit.prevent="handleCreate">
        <input v-model="form.brand" placeholder="廠牌，例如 YAMAHA" required />
        <input v-model="form.model" placeholder="車型，例如 勁戰六代" required />
        <input v-model.number="form.year" type="number" placeholder="年式" />
        <input v-model.number="form.mileage" type="number" placeholder="里程 (km)" />
        <input v-model="form.licensePlate" placeholder="車牌號碼" />
        <PrimaryButton type="submit" block :disabled="submitting">
          {{ submitting ? '儲存中...' : '新增車輛' }}
        </PrimaryButton>
      </form>

      <p v-if="vehicleStore.loading">載入中...</p>
      <EmptyState
        v-else-if="vehicleStore.vehicles.length === 0"
        :icon="Bike"
        title="尚未建立車輛"
        description="新增第一台車，開始建立屬於它的驗證紀錄。"
      >
        <template #action>
          <PrimaryButton @click="showForm = true">新增車輛</PrimaryButton>
        </template>
      </EmptyState>
      <div v-else class="vehicle-list">
        <VehicleCard
          v-for="vehicle in vehicleStore.vehicles"
          :key="vehicle.id"
          :vehicle="vehicle"
          @click="openVehicle(vehicle.id)"
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
  gap: var(--space-md);
}

.vehicle-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.vehicle-form input {
  height: 44px;
  padding: 0 var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 15px;
}

.vehicle-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
</style>
