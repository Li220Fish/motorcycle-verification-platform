import { defineStore } from 'pinia'
import { ref } from 'vue'

import { vehicleService } from '@/services/firebase/vehicle.service'
import { useAuthStore } from '@/stores/auth.store'
import type { Vehicle, VehicleDraft } from '@/types/vehicle'

export const useVehicleStore = defineStore('vehicle', () => {
  const vehicles = ref<Vehicle[]>([])
  const currentVehicle = ref<Vehicle | null>(null)
  const loading = ref(false)

  async function fetchVehicles(): Promise<void> {
    const authStore = useAuthStore()
    if (!authStore.user) {
      vehicles.value = []
      return
    }
    loading.value = true
    try {
      vehicles.value = await vehicleService.list(authStore.user.id)
    } finally {
      loading.value = false
    }
  }

  async function fetchVehicle(id: string): Promise<void> {
    loading.value = true
    try {
      currentVehicle.value = await vehicleService.get(id)
    } finally {
      loading.value = false
    }
  }

  async function createVehicle(draft: VehicleDraft): Promise<string> {
    const authStore = useAuthStore()
    if (!authStore.user) throw new Error('必須登入才能新增車輛')
    const id = await vehicleService.create(draft, authStore.user.id)
    await fetchVehicles()
    return id
  }

  async function updateVehicle(id: string, changes: Partial<VehicleDraft>): Promise<void> {
    await vehicleService.update(id, changes)
    if (currentVehicle.value?.id === id) {
      currentVehicle.value = { ...currentVehicle.value, ...changes }
    }
    const index = vehicles.value.findIndex((vehicle) => vehicle.id === id)
    if (index !== -1) vehicles.value[index] = { ...vehicles.value[index], ...changes }
  }

  return {
    vehicles,
    currentVehicle,
    loading,
    fetchVehicles,
    fetchVehicle,
    createVehicle,
    updateVehicle,
  }
})
