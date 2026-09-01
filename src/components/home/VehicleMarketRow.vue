<script setup lang="ts">
import { Bike, Heart, Store } from 'lucide-vue-next'

import type { MockMarketListing } from '@/data/home/marketplace-mock'

defineProps<{ listing: MockMarketListing; isFavorite?: boolean }>()
defineEmits<{ toggleFavorite: [] }>()
</script>

<template>
  <div class="market-row">
    <div class="thumb">
      <img v-if="listing.imageUrl" :src="listing.imageUrl" class="thumb-img" alt="" />
      <Bike v-else :size="32" color="var(--color-text-disabled)" />
      <span class="demo-tag">DEMO</span>
    </div>
    <div class="info">
      <div class="title-row">
        <p class="title">{{ listing.brand }} {{ listing.model }}</p>
        <!-- Every listing already requires a passing inspection to go live,
             so "已驗證" is no longer a differentiator — dealer-sold listings
             get their own badge instead (see marketplace-mock.ts). Icon-only
             and inline with the title, same treatment as the Home market
             card (VehicleMarketCard.vue). -->
        <span v-if="listing.sellerType === 'dealer'" class="dealer-badge" title="認證車商">
          <Store :size="11" />
        </span>
      </div>
      <p class="meta">
        {{ listing.year }} 年式 · {{ listing.mileageKm.toLocaleString() }} km · {{ listing.region }}
      </p>
      <div class="bottom-row">
        <span class="price">${{ listing.priceTwd.toLocaleString() }}</span>
      </div>
    </div>
    <button
      class="favorite-btn"
      :class="{ active: isFavorite }"
      :aria-label="isFavorite ? '取消收藏' : '加入我的最愛'"
      @click.stop="$emit('toggleFavorite')"
    >
      <Heart :size="18" :fill="isFavorite ? 'currentColor' : 'none'" />
    </button>
  </div>
</template>

<style scoped>
.market-row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-sm);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.thumb {
  position: relative;
  flex: 0 0 auto;
  width: 92px;
  height: 92px;
  border-radius: var(--radius-md);
  background: var(--color-background);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.demo-tag {
  position: absolute;
  top: 5px;
  left: 5px;
  font-size: 9px;
  font-weight: 800;
  color: var(--color-warning);
  background: var(--color-warning-bg);
  border-radius: 999px;
  padding: 1px 6px;
}

.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.title {
  min-width: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.meta {
  font-size: 12px;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bottom-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 2px;
}

.price {
  font-size: 16px;
  font-weight: 800;
  color: var(--color-primary);
}

.favorite-btn {
  flex-shrink: 0;
  align-self: flex-start;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--color-text-disabled);
  display: flex;
  align-items: center;
  justify-content: center;
}

.favorite-btn.active {
  color: var(--color-danger);
}
</style>
