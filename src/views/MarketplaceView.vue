<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppHeader from '@/components/common/AppHeader.vue'
import FeaturedDealersSection from '@/components/home/FeaturedDealersSection.vue'
import VehicleMarketRow from '@/components/home/VehicleMarketRow.vue'
import { homeContentService } from '@/services/firebase/home-content.service'
import type { MockMarketListing } from '@/data/home/marketplace-mock'

const router = useRouter()
const listings = ref<MockMarketListing[]>([])

onMounted(async () => {
  listings.value = await homeContentService.listMarketplaceListings()
})
</script>

<template>
  <div>
    <AppHeader title="交易市場" />

    <div class="content">
      <p class="demo-notice">目前為 DEMO 展示資料，真實交易市場功能尚在開發中。</p>
      <!-- Main list: horizontal row, image left — image should carry more
           weight than a squeezed 2-col grid, and a row reads faster when
           comparing price/mileage across cards (P1 §08 of the UX report). -->
      <div class="list">
        <button
          v-for="listing in listings"
          :key="listing.id"
          class="list-item"
          @click="router.push(`/marketplace/${listing.id}`)"
        >
          <VehicleMarketRow :listing="listing" />
        </button>
      </div>

      <FeaturedDealersSection />
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

.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.list-item {
  background: none;
  border: none;
  padding: 0;
  text-align: left;
  width: 100%;
}
</style>
