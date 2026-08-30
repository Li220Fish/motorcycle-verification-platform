<script setup lang="ts">
import { useRouter } from 'vue-router'

import VehicleMarketCard from './VehicleMarketCard.vue'
import type { MockMarketListing } from '@/data/home/marketplace-mock'

defineProps<{ listings: MockMarketListing[] }>()

const router = useRouter()
</script>

<template>
  <div class="carousel">
    <button
      v-for="listing in listings"
      :key="listing.id"
      class="carousel-item"
      @click="router.push('/marketplace')"
    >
      <VehicleMarketCard :listing="listing" />
    </button>
  </div>
</template>

<style scoped>
.carousel {
  display: flex;
  gap: var(--space-sm);
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
}

.carousel::-webkit-scrollbar {
  display: none;
}

.carousel-item {
  flex: 0 0 auto;
  background: none;
  border: none;
  padding: 0;
  text-align: left;
}
</style>
