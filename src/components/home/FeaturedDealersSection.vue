<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Star, Store } from 'lucide-vue-next'

import { homeContentService } from '@/services/firebase/home-content.service'
import type { MockFeaturedDealer } from '@/data/home/featured-dealers-mock'

const dealers = ref<MockFeaturedDealer[]>([])
const noticeMessage = ref('')
function handleDealerClick(): void {
  noticeMessage.value = '車商頁面尚未開放'
  setTimeout(() => {
    noticeMessage.value = ''
  }, 2000)
}

onMounted(async () => {
  dealers.value = await homeContentService.listFeaturedDealers()
})
</script>

<template>
  <div class="section">
    <h2>精選車商</h2>
    <div class="dealer-grid">
      <button
        v-for="dealer in dealers"
        :key="dealer.id"
        class="dealer-card"
        @click="handleDealerClick"
      >
        <div class="dealer-icon"><Store :size="20" color="var(--color-primary)" /></div>
        <p class="dealer-name">{{ dealer.name }}</p>
        <p class="dealer-rating">
          <Star :size="12" color="#e8912c" fill="#e8912c" />
          {{ dealer.rating.toFixed(1) }}（{{ dealer.reviewCount }}）
        </p>
        <p class="dealer-region">{{ dealer.region }}</p>
      </button>
    </div>
    <p v-if="noticeMessage" class="notice">{{ noticeMessage }}</p>
  </div>
</template>

<style scoped>
.section {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.section h2 {
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text-primary);
  margin: 0;
}

.dealer-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-sm);
}

.dealer-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  text-align: left;
}

.dealer-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: var(--color-primary-bg, #e8f1fd);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.dealer-name {
  font-size: 14.5px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.dealer-rating {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--color-text-secondary);
  margin: 0;
}

.dealer-region {
  font-size: 11.5px;
  color: var(--color-text-disabled);
  margin: 0;
}

.notice {
  text-align: center;
  font-size: 12px;
  color: var(--color-text-secondary);
  margin: 0;
}
</style>
