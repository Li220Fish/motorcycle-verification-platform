<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import {
  vehicleModelService,
  type VehicleModelOption,
} from '@/services/firebase/vehicle-model.service'

/**
 * 廠牌/車系/排氣量/名稱 cascading Search Select backed by the `vehicleModels`
 * reference collection — falls back to plain text input for 廠牌/名稱 when
 * the user's vehicle isn't in the catalog yet (or the catalog has nothing
 * loaded), so an incomplete admin-curated dataset never blocks creating a
 * vehicle/listing. 車系 and 排氣量 are narrowing steps only (no v-model of
 * their own) — they exist to help pick the right 名稱 among catalog entries
 * that share a 車系, not to be persisted separately (Vehicle has no 車系
 * field of its own).
 */
const brand = defineModel<string>('brand', { required: true })
const model = defineModel<string>('model', { required: true })

const emit = defineEmits<{ modelPicked: [VehicleModelOption | null] }>()

interface DisplacementBucket {
  key: string
  label: string
  min: number
  max: number
}

const BUCKETS: DisplacementBucket[] = [
  { key: '50-', label: '50cc以下', min: 0, max: 50 },
  { key: '51-125', label: '51~125', min: 51, max: 125 },
  { key: '126-250', label: '126~250', min: 126, max: 250 },
  { key: '251-549', label: '251~549', min: 251, max: 549 },
  { key: '550-1000', label: '549~1000', min: 550, max: 1000 },
  { key: '1000+', label: '1000以上', min: 1001, max: Infinity },
]

function bucketFor(cc: number | null): DisplacementBucket | null {
  if (cc == null) return null
  return BUCKETS.find((bucket) => cc >= bucket.min && cc <= bucket.max) ?? null
}

const options = ref<VehicleModelOption[]>([])
const manualBrand = ref(false)
const manualModel = ref(false)
const series = ref('')
const bucketKey = ref('')

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
const optionsForBrand = computed(() =>
  options.value.filter((option) => option.brand === brand.value),
)
const seriesForBrand = computed(() =>
  [...new Set(optionsForBrand.value.map((option) => option.series))].filter(Boolean).sort(),
)
const optionsForSeries = computed(() =>
  optionsForBrand.value.filter((option) => option.series === series.value),
)
const bucketsForSeries = computed(() => {
  const present = new Set(
    optionsForSeries.value.map((option) => bucketFor(option.displacementCc)?.key).filter(Boolean),
  )
  return BUCKETS.filter((bucket) => present.has(bucket.key))
})
const optionsForBucket = computed(() =>
  optionsForSeries.value.filter(
    (option) => bucketFor(option.displacementCc)?.key === bucketKey.value,
  ),
)

// A series with only one displacement bucket doesn't need the extra tap —
// auto-select it so 名稱 becomes pickable right after 車系.
watch(bucketsForSeries, (buckets) => {
  bucketKey.value = buckets.length === 1 ? buckets[0].key : ''
})

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
  series.value = ''
  bucketKey.value = ''
  model.value = ''
  manualModel.value = false
  emit('modelPicked', null)
}

function selectSeries(value: string): void {
  series.value = value
  bucketKey.value = ''
  model.value = ''
  emit('modelPicked', null)
}

function selectBucket(value: string): void {
  bucketKey.value = value
  model.value = ''
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
  emit('modelPicked', optionsForBucket.value.find((option) => option.name === value) ?? null)
}

function resetToSelect(): void {
  manualBrand.value = false
  manualModel.value = false
  brand.value = ''
  model.value = ''
  series.value = ''
  bucketKey.value = ''
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

    <template v-if="!manualModel">
      <label class="field">
        <span>車系</span>
        <select
          :value="series"
          required
          :disabled="!brand"
          @change="selectSeries(($event.target as HTMLSelectElement).value)"
        >
          <option value="" disabled>請選擇車系</option>
          <option v-for="item in seriesForBrand" :key="item" :value="item">{{ item }}</option>
        </select>
      </label>

      <label class="field">
        <span>排氣量</span>
        <select
          :value="bucketKey"
          required
          :disabled="!series"
          @change="selectBucket(($event.target as HTMLSelectElement).value)"
        >
          <option value="" disabled>請選擇排氣量</option>
          <option v-for="bucket in bucketsForSeries" :key="bucket.key" :value="bucket.key">
            {{ bucket.label }}
          </option>
        </select>
      </label>
    </template>

    <label class="field">
      <span>名稱</span>
      <select
        v-if="!manualModel"
        :value="model"
        required
        :disabled="!bucketKey"
        @change="selectModel(($event.target as HTMLSelectElement).value)"
      >
        <option value="" disabled>請選擇名稱</option>
        <option v-for="item in optionsForBucket" :key="item.id" :value="item.name">
          {{ item.name }}
        </option>
        <option value="__manual__">找不到我的名稱，手動輸入</option>
      </select>
      <input v-else v-model="model" type="text" placeholder="名稱，例如 勁戰六代" required />
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
