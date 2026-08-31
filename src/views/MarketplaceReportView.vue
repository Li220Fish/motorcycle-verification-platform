<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import AppHeader from '@/components/common/AppHeader.vue'
import InspectionReportBody from '@/components/verification/InspectionReportBody.vue'
import {
  buildMockInspectedDate,
  buildMockReportSections,
} from '@/data/home/marketplace-report-mock'
import { homeContentService } from '@/services/firebase/home-content.service'
import type { MockMarketListing } from '@/data/home/marketplace-mock'

const props = defineProps<{ id: string }>()

const listing = ref<MockMarketListing | null>(null)
const loading = ref(true)

watch(
  () => props.id,
  async (id) => {
    loading.value = true
    listing.value = await homeContentService.getMarketplaceListing(id)
    loading.value = false
  },
  { immediate: true },
)

const vehicleTitle = computed(() =>
  listing.value ? `${listing.value.year} ${listing.value.brand} ${listing.value.model}` : '—',
)
const inspectedDate = computed(() => (listing.value ? buildMockInspectedDate(listing.value) : '—'))
const sections = computed(() => (listing.value ? buildMockReportSections(listing.value) : []))
</script>

<template>
  <div>
    <AppHeader title="檢驗報告" back />
    <p v-if="loading" class="state-text">載入中...</p>
    <p v-else-if="!listing" class="state-text">找不到這台車輛。</p>
    <template v-else>
      <p class="demo-notice">DEMO 展示報告 — 內容為模擬資料，非真實驗車結果。</p>
      <InspectionReportBody
        :vehicle-title="vehicleTitle"
        :inspected-date="inspectedDate"
        :score="listing.verificationScore"
        :sections="sections"
      />
    </template>
  </div>
</template>

<style scoped>
.state-text {
  padding: var(--space-lg) var(--space-md);
  color: var(--color-text-secondary);
}

.demo-notice {
  margin: var(--space-md) var(--space-md) 0;
  font-size: 12.5px;
  color: var(--color-warning);
  background: var(--color-warning-bg);
  border-radius: var(--radius-sm);
  padding: var(--space-sm) var(--space-md);
}
</style>
