import { defineStore } from 'pinia'
import { ref } from 'vue'

import { verificationService } from '@/services/firebase/verification.service'
import type { Verification, VerificationDraft } from '@/types/verification'

export const useVerificationStore = defineStore('verification', () => {
  const verifications = ref<Verification[]>([])
  const loading = ref(false)

  async function fetchByVehicle(vehicleId: string): Promise<void> {
    loading.value = true
    try {
      verifications.value = await verificationService.listByVehicle(vehicleId)
    } finally {
      loading.value = false
    }
  }

  async function createVerification(draft: VerificationDraft): Promise<string> {
    const id = await verificationService.create(draft)
    await fetchByVehicle(draft.vehicleId)
    return id
  }

  return { verifications, loading, fetchByVehicle, createVerification }
})
