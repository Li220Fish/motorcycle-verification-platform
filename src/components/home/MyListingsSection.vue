<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Bike, Heart } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import { listingService } from '@/services/firebase/listing.service'
import { useAuthStore } from '@/stores/auth.store'
import type { MockMarketListing } from '@/data/home/marketplace-mock'

const router = useRouter()
const authStore = useAuthStore()

const STATUS_LABEL: Record<string, string> = { reviewing: '審核中', active: '售中' }
// Fallback for a listing with no imageUrl — deterministic per-card color so
// it's still visually distinct rather than a plain gray box.
const GRADIENTS = [
  'linear-gradient(135deg,#1f9d63,#0d5c39)',
  'linear-gradient(135deg,#e8912c,#7a4a10)',
  'linear-gradient(135deg,#6d5ce8,#2f1f7a)',
  'linear-gradient(135deg,#2f6fe8,#12306e)',
]

const listings = ref<MockMarketListing[]>([])

onMounted(async () => {
  if (!authStore.user) return
  listings.value = await listingService.listBySeller(authStore.user.id)
})
</script>

<template>
  <div class="section">
    <div class="section-header">
      <h2>我的刊登</h2>
      <button class="manage-link" @click="router.push('/my-listings')">管理 ›</button>
    </div>
    <div class="listing-grid">
      <div
        v-for="(listing, index) in listings"
        :key="listing.id"
        class="listing-card"
        @click="router.push(`/my-listings/${listing.id}`)"
      >
        <div
          class="thumb"
          :style="
            listing.vehicleSnapshot.photos[0]
              ? undefined
              : { background: GRADIENTS[index % GRADIENTS.length] }
          "
        >
          <span class="status-pill">{{
            STATUS_LABEL[listing.status === 'published' ? 'active' : 'reviewing']
          }}</span>
          <img
            v-if="listing.vehicleSnapshot.photos[0]"
            :src="listing.vehicleSnapshot.photos[0]"
            class="thumb-img"
            alt=""
          />
          <Bike v-else :size="34" color="#fff" />
        </div>
        <p class="title">
          {{ listing.vehicleSnapshot.manufactureYear }} {{ listing.vehicleSnapshot.brand }}
          {{ listing.vehicleSnapshot.model }}
        </p>
        <p class="price">${{ listing.priceTwd.toLocaleString() }}</p>
        <p class="interest"><Heart :size="12" /> {{ listing.sellerReviewCount }} 則評價</p>
      </div>
      <button v-if="listings.length === 0" class="empty-card" @click="router.push('/my-listings')">
        <Bike :size="26" color="var(--color-text-disabled)" />
        <span>新增第一筆刊登</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.section {
  padding: 0 var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.section-header h2 {
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text-primary);
  margin: 0;
}

.manage-link {
  border: none;
  background: none;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--color-primary);
  padding: 0;
}

.listing-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-sm);
}

.listing-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--space-sm);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  text-align: left;
}

.thumb {
  position: relative;
  height: 90px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
  overflow: hidden;
  background: var(--color-background);
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.status-pill {
  position: absolute;
  top: 6px;
  left: 6px;
  font-size: 10px;
  font-weight: 800;
  color: #fff;
  background: rgba(0, 0, 0, 0.28);
  border-radius: 999px;
  padding: 2px 8px;
}

.title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.price {
  font-size: 15px;
  font-weight: 800;
  color: var(--color-primary);
  margin: 0;
}

.interest {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  color: var(--color-text-secondary);
  margin: 0;
}

.empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 132px;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 12.5px;
  font-weight: 700;
}
</style>
