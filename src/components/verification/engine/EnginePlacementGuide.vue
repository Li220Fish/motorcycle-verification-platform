<script setup lang="ts">
import type { EngineTransmissionType } from '@/data/verification/engine-session'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

/**
 * Phone-placement screen shown once before the Idle session (spec §11-14) —
 * the single most important screen per the spec, since a wrong placement
 * ruins both the audio and IMU capture. Branches purely on vehicle type; if
 * that isn't known yet, the parent shows the type picker instead of a
 * `vehicleType` prop (spec §34 — never guessed silently).
 */
defineProps<{ vehicleType: EngineTransmissionType }>()
</script>

<template>
  <div class="placement-guide">
    <p class="direction">{{ t('placementGuide', 'direction') }}</p>
    <div class="diagram">
      <p class="vehicle-head">{{ t('placementGuide', 'vehicleHead') }}</p>
      <div v-if="vehicleType === 'manual'" class="fuel-tank">
        {{ t('placementGuide', 'fuelTank') }}
      </div>
      <div class="phone-box">
        <span class="phone-emoji">📱</span>
        <span class="phone-caption">{{ t('placementGuide', 'phoneCaption') }}</span>
      </div>
      <p class="placement-label">
        {{
          vehicleType === 'scooter' ? t('placementGuide', 'footboard') : t('placementGuide', 'seat')
        }}
      </p>
    </div>
    <p class="main-copy">
      {{
        vehicleType === 'scooter'
          ? t('placementGuide', 'scooterCopy')
          : t('placementGuide', 'manualCopy')
      }}
    </p>
    <ul class="tips">
      <li>{{ t('placementGuide', 'tipFixed') }}</li>
      <li>{{ t('placementGuide', 'tipMic') }}</li>
      <li>{{ t('placementGuide', 'tipNoMove') }}</li>
    </ul>
  </div>
</template>

<style scoped>
.placement-guide {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.direction {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-align: center;
}

.diagram {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: var(--space-lg);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-background);
}

.vehicle-head {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-disabled);
}

.fuel-tank {
  font-size: 11px;
  color: var(--color-text-disabled);
}

.phone-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 120px;
  padding: var(--space-md);
  border: 2px solid var(--color-primary);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.phone-emoji {
  font-size: 28px;
}

.phone-caption {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-primary);
}

.placement-label {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.main-copy {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-primary);
  text-align: center;
}

.tips {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
}
</style>
