<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import {
  vehicleModelService,
  type VehicleModelOption,
} from '@/services/firebase/vehicle-model.service'

/**
 * 廠牌/車型 Search Select backed by the `vehicleModels` reference collection
 * (Task B4) — falls back to plain text input when the user's vehicle isn't
 * in the catalog yet (or the catalog has nothing loaded), so an incomplete
 * admin-curated dataset never blocks creating a vehicle/listing.
 */
const brand = defineModel<string>('brand', { required: true })
const model = defineModel<string>('model', { required: true })

const emit = defineEmits<{ modelPicked: [VehicleModelOption | null] }>()

const options = ref<VehicleModelOption[]>([])
const manualBrand = ref(false)
const manualModel = ref(false)

onMounted(async () => {
  try {
    options.value = await vehicleModelService.listAll()
  } catch {
    options.value = []
  }
  if (options.value.length === 0) {
    manualBrand.value = true
    manualModel.value = true
  }
})

const brands = computed(() =>
  [...new Set(options.value.map((option) => option.brand))].filter(Boolean).sort(),
)
const modelsForBrand = computed(() =>
  options.value.filter((option) => option.brand === brand.value),
)

function selectBrand(value: string): void {
  if (value === '__manual__') {
    manualBrand.value = true
    manualModel.value = true
    brand.value = ''
    model.value = ''
    emit('modelPicked', null)
    return
  }
  brand.value = value
  model.value = ''
  manualModel.value = false
  emit('modelPicked', null)
}

function selectModel(value: string): void {
  if (value === '__manual__') {
    manualModel.value = true
    model.value = ''
    emit('modelPicked', null)
    return
  }
  model.value = value
  emit('modelPicked', modelsForBrand.value.find((option) => option.model === value) ?? null)
}

function resetToSelect(): void {
  manualBrand.value = false
  manualModel.value = false
  brand.value = ''
  model.value = ''
  emit('modelPicked', null)
}
</script>

<template>
  <div class="vehicle-model-select">
    <label class="field">
      <span>廠牌</span>
      <select
        v-if="!manualBrand"
        :value="brand"
        required
        @change="selectBrand(($event.target as HTMLSelectElement).value)"
      >
        <option value="" disabled>請選擇廠牌</option>
        <option v-for="item in brands" :key="item" :value="item">{{ item }}</option>
        <option value="__manual__">找不到我的廠牌，手動輸入</option>
      </select>
      <input v-else v-model="brand" type="text" placeholder="廠牌，例如 YAMAHA" required />
    </label>

    <label class="field">
      <span>車型</span>
      <select
        v-if="!manualModel"
        :value="model"
        required
        :disabled="!brand"
        @change="selectModel(($event.target as HTMLSelectElement).value)"
      >
        <option value="" disabled>請選擇車型</option>
        <option v-for="item in modelsForBrand" :key="item.id" :value="item.model">
          {{ item.model }}
        </option>
        <option value="__manual__">找不到我的車型，手動輸入</option>
      </select>
      <input v-else v-model="model" type="text" placeholder="車型，例如 勁戰六代" required />
    </label>

    <button
      v-if="manualBrand || manualModel"
      type="button"
      class="switch-back"
      @click="resetToSelect"
    >
      改用選單選擇
    </button>
  </div>
</template>

<style scoped>
.vehicle-model-select {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.field {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.field input,
.field select {
  width: 100%;
  height: 44px;
  padding: 0 var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 400;
  color: var(--color-text-primary);
  font-family: inherit;
  background: var(--color-background);
}

.switch-back {
  align-self: flex-start;
  border: none;
  background: none;
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 600;
  padding: 0;
}
</style>
