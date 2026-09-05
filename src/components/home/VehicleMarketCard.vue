<script setup lang="ts">
import { Bike, Store } from 'lucide-vue-next'

import type { MockMarketListing } from '@/data/home/marketplace-mock'

defineProps<{ listing: MockMarketListing }>()
</script>

<template>
  <div class="market-card">
    <div class="thumb">
      <img
        v-if="listing.vehicleSnapshot.photos[0]"
        :src="listing.vehicleSnapshot.photos[0]"
        class="thumb-img"
        alt=""
      />
      <Bike v-else :size="30" color="var(--color-text-disabled)" />
      <span v-if="listing.verificationIds.length === 0" class="demo-tag">DEMO</span>
    </div>
    <div class="title-row">
      <p class="title">{{ listing.vehicleSnapshot.brand }} {{ listing.vehicleSnapshot.model }}</p>
      <!-- Every listing already requires a passing inspection to go live, so
           "已驗證" is no longer a differentiator — dealer-sold listings get
           their own badge instead (see marketplace-mock.ts). Icon-only and
           inline with the title (not its own row) so it never crowds out
           the price/mileage rows within the card's fixed height. -->
      <span v-if="listing.sellerType === 'dealer'" class="dealer-badge" title="認證車商">
        <Store :size="11" />
      </span>
    </div>
    <p class="year">{{ listing.vehicleSnapshot.manufactureYear }}</p>
    <div class="stat-row">
      <span class="stat-label">里程</span>
      <span class="stat-value">{{ listing.vehicleSnapshot.mileage.toLocaleString() }} km</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">價格</span>
      <span class="stat-value price">${{ listing.priceTwd.toLocaleString() }}</span>
    </div>
  </div>
</template>

<style scoped>
.market-card {
  flex: 0 0 auto;
  width: 168px;
  /* Fixed regardless of content — a dealer badge, a longer title, etc. must
     never change the card's height (would otherwise stagger cards mid-row
     in the horizontal carousel). */
  height: 220px;
  overflow: hidden;
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
  /* Explicit, not just "stretched by the flex parent" — the photo box must
     be the exact same pixel size on every card regardless of layout. */
  width: 152px;
  height: 96px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  background: var(--color-background);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
  overflow: hidden;
}

.thumb-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
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

.title-row {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.title {
  min-width: 0;
  flex: 1;
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.dealer-badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  color: var(--color-primary);
  background: var(--color-primary-bg, #e8f1fd);
  border-radius: 999px;
}
</style>
