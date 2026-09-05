<script setup lang="ts">
import type { EngineTransmissionType } from '@/data/verification/engine-session'

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
    <p class="direction">螢幕朝上，手機頂端朝向車頭</p>
    <div class="diagram">
      <p class="vehicle-head">車頭 ↑</p>
      <div v-if="vehicleType === 'manual'" class="fuel-tank">油箱</div>
      <div class="phone-box">
        <span class="phone-emoji">📱</span>
        <span class="phone-caption">手機頂端朝前</span>
      </div>
      <p class="placement-label">
        {{ vehicleType === 'scooter' ? '中央腳踏板' : '前座坐墊' }}
      </p>
    </div>
    <p class="main-copy">
      {{
        vehicleType === 'scooter'
          ? '請將手機平放在中央腳踏板。'
          : '請將手機平放在前座坐墊中央偏前的位置。'
      }}
    </p>
    <ul class="tips">
      <li>✓ 手機保持固定</li>
      <li>✓ 不要遮住麥克風</li>
      <li>✓ 檢測中不要移動手機</li>
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
