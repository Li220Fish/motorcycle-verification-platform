import { defineStore } from 'pinia'
import { ref } from 'vue'

import { vehicleService } from '@/services/firebase/vehicle.service'
import type { Vehicle, VehicleDraft } from '@/types/vehicle'

export const useVehicleStore = defineStore('vehicle', () => {
  const vehicles = ref<Vehicle[]>([])
  const currentVehicle = ref<Vehicle | null>(null)
  const loading = ref(false)

  async function fetchVehicles(): Promise<void> {
    loading.value = true
    try {
      vehicles.value = await vehicleService.list()
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
    const id = await vehicleService.create(draft)
    await fetchVehicles()
    return id
  }

  return { vehicles, currentVehicle, loading, fetchVehicles, fetchVehicle, createVehicle }
})
