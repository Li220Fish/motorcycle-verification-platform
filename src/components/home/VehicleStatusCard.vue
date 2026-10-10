<script setup lang="ts">
import { Bike } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import { useI18n } from '@/composables/useI18n'
import type { Vehicle } from '@/types/vehicle'

// `vehicle: null` renders the empty-garage state — this card IS the Home
// hero now (no more marketing tagline banner), so it needs an empty state
// of its own rather than falling back to a different component.
const props = defineProps<{
  vehicle: Vehicle | null
  statusLabel?: string
  /** No longer stored on the Vehicle doc — computed by the caller from
   * fuelLogs (see HomeContent.vue), same calc VehicleDetailView.vue uses. */
  avgFuelConsumption?: number | null
}>()

const router = useRouter()
const { t } = useI18n()

// The whole card is the tap target now (no separate "查看車輛" button) —
// always routes to the full garage list (/vehicles), same for one vehicle
// or many, and no vehicle yet starts the create flow from there too. Used
// to jump straight to the single vehicle's own detail page when there was
// only one — dropped (2026-10) because that skipped past /vehicles
// entirely, which is where the "+" button's 新增車輛/車輛轉移 menu lives;
// an owner with exactly one vehicle had no way to reach 車輛轉移 to redeem
// an invite code.
function handleClick(): void {
  router.push('/vehicles')
}
</script>

<template>
  <button
    class="status-card"
    :class="{ 'has-photo': !!props.vehicle?.photos[0] }"
    :style="
      props.vehicle?.photos[0]
        ? {
            backgroundImage: `linear-gradient(135deg, rgba(37,99,235,.88), rgba(27,63,174,.92)), url('${props.vehicle.photos[0]}')`,
          }
        : undefined
    "
    @click="handleClick"
  >
    <Bike v-if="!props.vehicle?.photos[0]" class="bg-icon" :size="120" />
    <p class="label">{{ t('home', 'myVehicle') }}</p>
    <template v-if="props.vehicle">
      <p class="title">
        {{ props.vehicle.manufactureYear ? `${props.vehicle.manufactureYear} ` : ''
        }}{{ props.vehicle.brand }} {{ props.vehicle.model }}<!-- 不用加入驗證狀態 -->
      </p>
      <div class="stats-row">
        <div class="stat">
          <span class="stat-value">{{ props.vehicle.mileage?.toLocaleString() ?? '—' }}</span>
          <span class="stat-label">{{ t('home', 'totalMileage') }} km</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ props.avgFuelConsumption ?? '—' }}</span>
          <span class="stat-label">{{ t('home', 'avgFuelEfficiency') }}</span>
        </div>
      </div>
    </template>
    <template v-else>
      <p class="title">{{ t('home', 'noVehicleTitle') }}</p>
      <p class="empty-desc">{{ t('home', 'noVehicleDesc') }}</p>
    </template>
  </button>
</template>

<style scoped>
.status-card {
  position: relative;
  overflow: hidden;
  width: 100%;
  padding: var(--space-lg);
  border: none;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--color-primary) 0%, #1b3fae 100%);
  color: #fff;
  font: inherit;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.status-card:active {
  transform: scale(0.99);
}

.status-card.has-photo {
  background-size: cover;
  background-position: center;
}

.bg-icon {
  position: absolute;
  right: -18px;
  bottom: -18px;
  opacity: 0.15;
  color: #fff;
}

.label {
  margin: 0;
  font-size: 12.5px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.75);
}

.title {
  margin: 0;
  font-size: 19px;
  font-weight: 800;
  line-height: 1.3;
  max-width: 90%;
}

.empty-desc {
  position: relative;
  z-index: 1;
  margin: 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
}

.stats-row {
  position: relative;
  z-index: 1;
  display: flex;
  gap: var(--space-sm);
  margin-top: 4px;
}

.stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--space-sm) 4px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.14);
}

.stat-value {
  font-size: 16px;
  font-weight: 800;
}

.stat-label {
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.8);
}
</style>
