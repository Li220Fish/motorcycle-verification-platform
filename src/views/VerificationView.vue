<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

import PageHeader from '@/components/common/PageHeader.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useVehicleStore } from '@/stores/vehicle.store'
import { useVerificationStore } from '@/stores/verification.store'
import type { VerificationType } from '@/types/verification'

const authStore = useAuthStore()
const vehicleStore = useVehicleStore()
const verificationStore = useVerificationStore()

const selectedVehicleId = ref('')
const type = ref<VerificationType>('seller')
const mileage = ref<number | null>(null)
const submitting = ref(false)

async function handleCreate(): Promise<void> {
  if (!selectedVehicleId.value || !authStore.user) return
  submitting.value = true
  try {
    await verificationStore.createVerification({
      vehicleId: selectedVehicleId.value,
      userId: authStore.user.id,
      type: type.value,
      status: 'draft',
      mileage: mileage.value ?? undefined,
    })
    mileage.value = null
  } finally {
    submitting.value = false
  }
}

watch(selectedVehicleId, (vehicleId) => {
  if (vehicleId) verificationStore.fetchByVehicle(vehicleId)
})

onMounted(async () => {
  await vehicleStore.fetchVehicles()
  if (vehicleStore.vehicles.length > 0) {
    selectedVehicleId.value = vehicleStore.vehicles[0].id
  }
})
</script>

<template>
  <section>
    <PageHeader
      title="Verification"
      description="Minimal verification record creation. Verification always relates to a Vehicle via vehicleId — never to a buyer/seller account."
    />

    <div class="form-row">
      <label>
        Vehicle
        <select v-model="selectedVehicleId">
          <option v-for="vehicle in vehicleStore.vehicles" :key="vehicle.id" :value="vehicle.id">
            {{ vehicle.brand }} {{ vehicle.model }}
          </option>
        </select>
      </label>
      <label>
        Type
        <select v-model="type">
          <option value="seller">Seller</option>
          <option value="buyer">Buyer</option>
          <option value="professional">Professional</option>
        </select>
      </label>
      <label>
        Mileage
        <input v-model.number="mileage" type="number" />
      </label>
      <button :disabled="submitting || !selectedVehicleId" @click="handleCreate">
        {{ submitting ? 'Saving...' : 'Create Verification' }}
      </button>
    </div>

    <h2>Verifications for selected vehicle</h2>
    <ul class="verification-list">
      <li v-for="verification in verificationStore.verifications" :key="verification.id">
        {{ verification.type }} — {{ verification.status }} — mileage:
        {{ verification.mileage ?? 'n/a' }}
      </li>
      <li v-if="verificationStore.verifications.length === 0">No verifications yet.</li>
    </ul>
  </section>
</template>

<style scoped>
.form-row {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.form-row label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.verification-list {
  list-style: none;
  padding: 0;
}

.verification-list li {
  padding: 0.4rem 0;
  border-bottom: 1px solid #e0e0e0;
}
</style>
