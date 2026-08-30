<script setup lang="ts">
import { useRouter } from 'vue-router'

import AppHeader from '@/components/common/AppHeader.vue'
import VehicleMarketCard from '@/components/home/VehicleMarketCard.vue'
import { MOCK_MARKET_LISTINGS } from '@/data/home/marketplace-mock'

const router = useRouter()
</script>

<template>
  <div>
    <AppHeader title="交易市場" />

    <div class="content">
      <p class="demo-notice">目前為 DEMO 展示資料，真實交易市場功能尚在開發中。</p>
      <div class="grid">
        <button
          v-for="listing in MOCK_MARKET_LISTINGS"
          :key="listing.id"
          class="grid-item"
          @click="router.push('/dashboard')"
        >
          <VehicleMarketCard :listing="listing" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.content {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.demo-notice {
  font-size: 12.5px;
  color: var(--color-warning);
  background: var(--color-warning-bg);
  border-radius: var(--radius-sm);
  padding: var(--space-sm) var(--space-md);
  margin: 0;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-sm);
}

.grid-item {
  background: none;
  border: none;
  padding: 0;
  text-align: left;
}

.grid-item :deep(.market-card) {
  width: 100%;
}
</style>
