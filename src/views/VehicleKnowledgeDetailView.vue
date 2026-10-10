<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Bike } from 'lucide-vue-next'

import AppHeader from '@/components/common/AppHeader.vue'
import { useI18n } from '@/composables/useI18n'
import { vehicleModelService } from '@/services/firebase/vehicle-model.service'
import type { VehicleModelProfile } from '@/services/firebase/vehicle-model.service'

const props = defineProps<{ modelId: string }>()
const { t } = useI18n()

const model = ref<VehicleModelProfile | null>(null)
const loaded = ref(false)

const displayName = computed(() => {
  if (!model.value) return t('vehicleKnowledge', 'defaultTitle')
  return [model.value.brand, model.value.series, model.value.trimName].filter(Boolean).join(' ')
})

interface SpecRow {
  label: string
  value: string
}

const specRows = computed<SpecRow[]>(() => {
  if (!model.value) return []
  const { specs, powerType, displacementCc, transmission } = model.value
  const rows: SpecRow[] = []

  if (powerType === 'gasoline' && displacementCc != null) {
    rows.push({ label: t('vehicleKnowledge', 'displacement'), value: `${displacementCc} c.c.` })
  }
  if (transmission) {
    rows.push({ label: t('vehicleKnowledge', 'transmission'), value: transmission })
  }
  if (specs.maxPowerHp != null) {
    rows.push({ label: t('vehicleKnowledge', 'maxPower'), value: `${specs.maxPowerHp} ps` })
  }
  if (specs.maxTorqueKgm != null) {
    rows.push({ label: t('vehicleKnowledge', 'maxTorque'), value: `${specs.maxTorqueKgm} kgm` })
  }
  if (powerType === 'gasoline' && specs.fuelTankCapacityL != null) {
    rows.push({ label: t('vehicleKnowledge', 'fuelTank'), value: `${specs.fuelTankCapacityL} L` })
  }
  if (powerType === 'electric' && specs.motorPowerW != null) {
    rows.push({ label: t('vehicleKnowledge', 'motorPower'), value: `${specs.motorPowerW} W` })
  }
  if (specs.weightKg != null) {
    rows.push({ label: t('vehicleKnowledge', 'weight'), value: `${specs.weightKg} kg` })
  }
  if (specs.seatHeightMm != null) {
    rows.push({ label: t('vehicleKnowledge', 'seatHeight'), value: `${specs.seatHeightMm} mm` })
  }
  if (specs.officialAverageKmPerL != null) {
    rows.push({
      label: t('vehicleKnowledge', 'avgFuelConsumption'),
      value: `${specs.officialAverageKmPerL} km/L`,
    })
  }
  return rows
})

const safetyBadges = computed(() => {
  if (!model.value) return []
  const { abs, tcs, cbs } = model.value.specs
  return [abs ? 'ABS' : null, tcs ? 'TCS' : null, cbs ? 'CBS' : null].filter(
    (label): label is string => !!label,
  )
})

onMounted(async () => {
  model.value = await vehicleModelService.getProfile(props.modelId).catch(() => null)
  loaded.value = true
})
</script>

<template>
  <div>
    <AppHeader :title="displayName" back />

    <div v-if="!loaded" class="loading">{{ t('vehicleKnowledge', 'loading') }}</div>
    <div v-else-if="!model" class="loading">{{ t('vehicleKnowledge', 'notFound') }}</div>

    <div v-else class="scroll">
      <div class="hero">
        <img v-if="model.coverImageUrl" :src="model.coverImageUrl" alt="" class="hero-image" />
        <div v-else class="hero-image hero-fallback">
          <Bike :size="40" color="var(--color-text-disabled)" />
        </div>
      </div>

      <div class="title-block">
        <p class="title">{{ displayName }}</p>
        <div class="tags">
          <span v-if="model.modelYear" class="tag">
            {{ t('vehicleKnowledge', 'modelYear', { year: model.modelYear }) }}
          </span>
          <span v-if="model.bodyType" class="tag">{{ model.bodyType }}</span>
          <span class="tag">{{
            model.powerType === 'electric'
              ? t('vehicleKnowledge', 'electric')
              : t('vehicleKnowledge', 'gasoline')
          }}</span>
          <span v-if="model.hasChain" class="tag">{{ t('vehicleKnowledge', 'chainDrive') }}</span>
        </div>
        <p v-if="model.synonyms.length > 0" class="synonyms">
          {{ t('vehicleKnowledge', 'synonyms', { names: model.synonyms.join('、') }) }}
        </p>
      </div>

      <div class="card">
        <p class="card-title">{{ t('vehicleKnowledge', 'specs') }}</p>
        <div v-if="specRows.length > 0 || safetyBadges.length > 0" class="spec-grid">
          <div v-for="row in specRows" :key="row.label" class="spec-row">
            <span class="spec-label">{{ row.label }}</span>
            <span class="spec-value">{{ row.value }}</span>
          </div>
          <div v-if="safetyBadges.length > 0" class="spec-row">
            <span class="spec-label">{{ t('vehicleKnowledge', 'safetyEquipment') }}</span>
            <span class="spec-value">{{ safetyBadges.join(' / ') }}</span>
          </div>
        </div>
        <p v-else class="empty-note">{{ t('vehicleKnowledge', 'noSpecsYet') }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading {
  text-align: center;
  color: var(--color-text-disabled);
  padding: var(--space-lg) 0;
}

.scroll {
  padding: var(--space-md);
  padding-bottom: 90px;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.hero-image {
  width: 100%;
  aspect-ratio: 16 / 10;
  border-radius: var(--radius-lg);
  object-fit: cover;
  background: var(--color-surface);
}

.hero-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
}

.title-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.title {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
  color: var(--color-text-primary);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-primary);
  background: var(--color-primary-bg, #e8f1fd);
  border-radius: 999px;
  padding: 3px 10px;
}

.synonyms {
  margin: 0;
  font-size: 12.5px;
  color: var(--color-text-secondary);
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.card-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.spec-grid {
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.spec-row {
  display: flex;
  justify-content: space-between;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  font-size: 13px;
  background: var(--color-background);
}

.spec-row:not(:last-child) {
  border-bottom: 1px solid var(--color-border);
}

.spec-label {
  color: var(--color-text-secondary);
}

.spec-value {
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: right;
}

.empty-note {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-disabled);
}
</style>
