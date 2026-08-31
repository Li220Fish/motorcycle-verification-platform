<script setup lang="ts">
import { Bike } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import type { Vehicle } from '@/types/vehicle'

// `vehicle: null` renders the empty-garage state — this card IS the Home
// hero now (no more marketing tagline banner), so it needs an empty state
// of its own rather than falling back to a different component.
const props = defineProps<{ vehicle: Vehicle | null; statusLabel?: string }>()

const router = useRouter()
</script>

<template>
  <div
    class="status-card"
    :class="{ 'has-photo': !!props.vehicle?.imageUrl }"
    :style="
      props.vehicle?.imageUrl
        ? {
            backgroundImage: `linear-gradient(135deg, rgba(37,99,235,.88), rgba(27,63,174,.92)), url('${props.vehicle.imageUrl}')`,
          }
        : undefined
    "
  >
    <Bike v-if="!props.vehicle?.imageUrl" class="bg-icon" :size="120" />
    <p class="label">我的車輛</p>
    <template v-if="props.vehicle">
      <p class="title">
        {{ props.vehicle.year ? `${props.vehicle.year} ` : '' }}{{ props.vehicle.brand }}
        {{ props.vehicle.model }} · {{ statusLabel }}
      </p>
      <div class="stats-row">
        <div class="stat">
          <span class="stat-value">{{ props.vehicle.maintenanceReminderCount ?? 0 }}</span>
          <span class="stat-label">保養提醒</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ props.vehicle.mileage?.toLocaleString() ?? '—' }}</span>
          <span class="stat-label">總里程 km</span>
        </div>
        <div class="stat">
          <span class="stat-value">{{ props.vehicle.avgFuelConsumption ?? '—' }}</span>
          <span class="stat-label">平均油耗</span>
        </div>
      </div>
      <button class="view-btn" @click="router.push(`/vehicles/${props.vehicle.id}`)">
        查看車輛 →
      </button>
    </template>
    <template v-else>
      <p class="title">尚未新增車輛</p>
      <p class="empty-desc">新增第一台車，開始記錄車況與驗證紀錄。</p>
      <button class="view-btn" @click="router.push('/vehicles')">新增車輛 →</button>
    </template>
  </div>
</template>

<style scoped>
.status-card {
  position: relative;
  overflow: hidden;
  padding: var(--space-lg);
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--color-primary) 0%, #1b3fae 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
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

.view-btn {
  position: relative;
  z-index: 1;
  align-self: flex-start;
  margin-top: 2px;
  border: none;
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
}
</style>
