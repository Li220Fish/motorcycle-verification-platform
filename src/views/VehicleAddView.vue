<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppHeader from '@/components/common/AppHeader.vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import VehicleModelSelect from '@/components/common/VehicleModelSelect.vue'
import { useI18n } from '@/composables/useI18n'
import { useVehicleStore } from '@/stores/vehicle.store'
import type { VehicleModelOption } from '@/services/firebase/vehicle-model.service'
import type { VehicleDraft } from '@/types/vehicle'

const vehicleStore = useVehicleStore()
const router = useRouter()
const { t } = useI18n()

const submitting = ref(false)

const form = reactive<VehicleDraft>({
  brand: '',
  model: '',
  manufactureYear: null,
  mileage: null,
  licensePlate: '',
  photos: [],
  modelId: null,
  displacementCc: null,
  transmission: null,
  hasChain: null,
})

/** Populates the fields the catalog already knows — modelId/displacementCc/
 *  transmission/hasChain — so a picked model doesn't just fill in
 *  brand/model text but also feeds BasicHealthCheck13.vue's 鏈條 item later.
 *  `null` (manual entry / cleared selection) resets them the same way. */
function handleModelPicked(option: VehicleModelOption | null): void {
  form.modelId = option?.id ?? null
  form.displacementCc = option?.displacementCc ?? null
  form.transmission = option?.transmission ?? null
  form.hasChain = option?.hasChain ?? null
}

async function handleCreate(): Promise<void> {
  submitting.value = true
  try {
    await vehicleStore.createVehicle({ ...form })
    router.replace('/vehicles')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div>
    <AppHeader :title="t('vehicleAdd', 'title')" back />

    <div class="content">
      <form class="vehicle-form" @submit.prevent="handleCreate">
        <VehicleModelSelect
          v-model:brand="form.brand"
          v-model:model="form.model"
          @model-picked="handleModelPicked"
        />
        <input
          v-model.number="form.manufactureYear"
          type="number"
          :placeholder="t('vehicleAdd', 'yearPlaceholder')"
        />
        <input
          v-model.number="form.mileage"
          type="number"
          :placeholder="t('vehicleAdd', 'mileagePlaceholder')"
        />
        <input v-model="form.licensePlate" :placeholder="t('vehicleAdd', 'platePlaceholder')" />
        <PrimaryButton type="submit" block :disabled="submitting">
          {{ submitting ? t('common', 'saving') : t('vehicleAdd', 'submit') }}
        </PrimaryButton>
      </form>
    </div>
  </div>
</template>

<style scoped>
.content {
  padding: var(--space-md);
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
  width: 100%;
  height: 44px;
  padding: 0 var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 15px;
}
</style>
