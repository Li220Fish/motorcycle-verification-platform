<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'

import PageHeader from '@/components/common/PageHeader.vue'
import { useVehicleStore } from '@/stores/vehicle.store'
import type { VehicleDraft } from '@/types/vehicle'

const vehicleStore = useVehicleStore()

const form = reactive<VehicleDraft>({
  brand: '',
  model: '',
  year: null,
  mileage: null,
  licensePlate: '',
})

const submitting = ref(false)

async function handleCreate(): Promise<void> {
  submitting.value = true
  try {
    await vehicleStore.createVehicle({ ...form })
    form.brand = ''
    form.model = ''
    form.year = null
    form.mileage = null
    form.licensePlate = ''
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  vehicleStore.fetchVehicles()
})
</script>

<template>
  <section>
    <PageHeader title="Vehicles" description="Create and list vehicles stored in Firestore." />

    <form class="vehicle-form" @submit.prevent="handleCreate">
      <input v-model="form.brand" placeholder="Brand" required />
      <input v-model="form.model" placeholder="Model" required />
      <input v-model.number="form.year" type="number" placeholder="Year" />
      <input v-model.number="form.mileage" type="number" placeholder="Mileage" />
      <input v-model="form.licensePlate" placeholder="License Plate" />
      <button type="submit" :disabled="submitting">
        {{ submitting ? 'Saving...' : 'Create Vehicle' }}
      </button>
    </form>

    <h2>Vehicle List ({{ vehicleStore.vehicles.length }})</h2>
    <p v-if="vehicleStore.loading">Loading...</p>
    <ul v-else class="vehicle-list">
      <li v-for="vehicle in vehicleStore.vehicles" :key="vehicle.id">
        <RouterLink :to="`/vehicles/${vehicle.id}`">
          {{ vehicle.brand }} {{ vehicle.model }} ({{ vehicle.year ?? 'n/a' }})
        </RouterLink>
      </li>
      <li v-if="vehicleStore.vehicles.length === 0">No vehicles yet.</li>
    </ul>
  </section>
</template>

<style scoped>
.vehicle-form {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.vehicle-form input {
  padding: 0.4rem;
}

.vehicle-list {
  list-style: none;
  padding: 0;
}

.vehicle-list li {
  padding: 0.4rem 0;
  border-bottom: 1px solid #e0e0e0;
}
</style>
