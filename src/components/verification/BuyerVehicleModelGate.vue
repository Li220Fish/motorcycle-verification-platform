<script setup lang="ts">
/** 買家複驗專屬關卡 — only shown when the target vehicle has no catalog
 *  modelId linked yet (seller listed it with free-text brand/model, or the
 *  buyer's own "幫這次驗車取個名字" vehicle was never matched to a catalog
 *  entry). Same "full-screen gate before the Hub" tier as VehicleTypeGate.vue
 *  / BuyerYearGate.vue — shown BEFORE BuyerYearGate (VerificationStepsView
 *  .vue's needsModelGate / needsYearGate ordering) since picking the real
 *  catalog model is what actually unlocks 通病 (known-issue) lookup; the
 *  year question alone can't. Picking a model here is optional — the
 *  catalog may genuinely not have this vehicle yet, and skipping just means
 *  no known-issue data for this verification (same as today). */
import { computed, ref } from 'vue'
import PrimaryButton from '@/components/common/PrimaryButton.vue'
import VehicleModelSelect from '@/components/common/VehicleModelSelect.vue'
import type { VehicleModelOption } from '@/services/firebase/vehicle-model.service'

const props = defineProps<{ knownBrand?: string | null; knownModel?: string | null }>()
/** null when the buyer typed a manual brand/model with no catalog match —
 *  VerificationStepsView.vue treats that the same as "skip" (no known-issue
 *  snapshot gets loaded), matching today's existing silent-no-op behavior
 *  for unlinked vehicles. */
const emit = defineEmits<{ confirm: [string | null] }>()

const brand = ref('')
const model = ref('')
const picked = ref<VehicleModelOption | null>(null)

function handleModelPicked(option: VehicleModelOption | null): void {
  picked.value = option
}

const knownVehicleLabel = computed(() => {
  const parts = [props.knownBrand, props.knownModel].filter((part): part is string => !!part)
  return parts.join(' ')
})

const canSubmit = computed(() => brand.value.trim() !== '' && model.value.trim() !== '')

function submit(): void {
  if (!canSubmit.value) return
  emit('confirm', picked.value?.id ?? null)
}
</script>

<template>
  <div class="model-gate">
    <h2>這台車是哪個車型？</h2>
    <p class="hint">
      請從車型資料庫選擇目前要驗的這台車，選對車型後系統會自動帶入這款車常見的通病，在檢查到對應部位時提醒你。
      <template v-if="knownVehicleLabel">（賣家填寫的車輛：{{ knownVehicleLabel }}）</template>
    </p>
    <VehicleModelSelect
      v-model:brand="brand"
      v-model:model="model"
      @model-picked="handleModelPicked"
    />
    <PrimaryButton block :disabled="!canSubmit" @click="submit">確認</PrimaryButton>
  </div>
</template>

<style scoped>
.model-gate {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  margin: var(--space-md);
  /* Same "no AppHeader ancestor" top-inset need as VehicleTypeGate.vue /
     BuyerYearGate.vue. */
  margin-top: calc(var(--space-md) + var(--safe-area-inset-top, env(safe-area-inset-top)));
}

.model-gate h2 {
  font-size: 18px;
  font-weight: 700;
}

.hint {
  font-size: 13px;
  color: var(--color-text-secondary);
}
</style>
