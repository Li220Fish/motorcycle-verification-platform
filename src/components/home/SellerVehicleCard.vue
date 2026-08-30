<script setup lang="ts">
import { Bike } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import type { Vehicle } from '@/types/vehicle'

const props = defineProps<{
  vehicle: Vehicle
  percent: number | null
  verificationId: string | null
}>()

const router = useRouter()

function handleContinue(): void {
  if (props.verificationId) {
    router.push(`/verification/${props.verificationId}`)
  } else {
    router.push(`/verification?vehicleId=${props.vehicle.id}`)
  }
}
</script>

<template>
  <div class="vehicle-card">
    <div class="thumb"><Bike :size="26" color="var(--color-text-disabled)" /></div>
    <div class="info">
      <p class="title">{{ vehicle.brand }} {{ vehicle.model }} {{ vehicle.year ?? '' }}</p>
      <p v-if="vehicle.licensePlate" class="plate">{{ vehicle.licensePlate }}</p>

      <template v-if="percent !== null">
        <div class="progress-row">
          <span>驗證進度 {{ percent }}%</span>
        </div>
        <div class="progress-bar"><div class="fill" :style="{ width: `${percent}%` }" /></div>
        <button class="continue-btn" @click="handleContinue">繼續驗證</button>
      </template>
      <template v-else>
        <button class="continue-btn secondary" @click="handleContinue">開始車況驗證</button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.vehicle-card {
  display: flex;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.thumb {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: var(--radius-md);
  background: var(--color-background);
  display: flex;
  align-items: center;
  justify-content: center;
}

.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.title {
  font-size: 14.5px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.plate {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: -2px;
}

.progress-row {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.progress-bar {
  height: 6px;
  border-radius: 999px;
  background: var(--color-background);
  overflow: hidden;
}

.fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 999px;
}

.continue-btn {
  align-self: flex-start;
  margin-top: 6px;
  height: 36px;
  padding: 0 16px;
  border-radius: var(--radius-sm);
  border: none;
  background: var(--color-primary);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}

.continue-btn.secondary {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}
</style>
