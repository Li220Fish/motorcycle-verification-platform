<script setup lang="ts">
import { Bike, ShieldCheck } from 'lucide-vue-next'

import type { MockMarketListing } from '@/data/home/marketplace-mock'

defineProps<{ listing: MockMarketListing }>()
</script>

<template>
  <div class="market-card">
    <div class="thumb">
      <Bike :size="30" color="var(--color-text-disabled)" />
      <span class="demo-tag">DEMO</span>
    </div>
    <p class="title">{{ listing.brand }} {{ listing.model }}</p>
    <p class="year">{{ listing.year }}</p>
    <div class="stat-row">
      <span class="stat-label">里程</span>
      <span class="stat-value">{{ listing.mileageKm.toLocaleString() }} km</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">價格</span>
      <span class="stat-value price">${{ listing.priceTwd.toLocaleString() }}</span>
    </div>
    <span v-if="listing.verified" class="verified-badge"> <ShieldCheck :size="13" /> 已驗證 </span>
  </div>
</template>

<style scoped>
.market-card {
  flex: 0 0 auto;
  width: 168px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--space-sm);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.thumb {
  position: relative;
  height: 96px;
  border-radius: var(--radius-md);
  background: var(--color-background);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.demo-tag {
  position: absolute;
  top: 6px;
  left: 6px;
  font-size: 9.5px;
  font-weight: 800;
  color: var(--color-warning);
  background: var(--color-warning-bg);
  border-radius: 999px;
  padding: 2px 7px;
}

.title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.year {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: -2px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.stat-label {
  color: var(--color-text-disabled);
}

.stat-value {
  color: var(--color-text-primary);
  font-weight: 600;
}

.stat-value.price {
  color: var(--color-primary);
  font-weight: 800;
}

.verified-badge {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-top: 4px;
  font-size: 11px;
  font-weight: 700;
  color: var(--color-success);
  background: var(--color-success-bg);
  border-radius: 999px;
  padding: 2px 8px;
}
</style>
