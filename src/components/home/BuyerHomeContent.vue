<script setup lang="ts">
import { Camera, Search, ShieldCheck, ShoppingBag } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import HomeHero from './HomeHero.vue'
import QuickActionGrid from './QuickActionGrid.vue'
import type { QuickAction } from './QuickActionGrid.vue'
import VehicleCarousel from './VehicleCarousel.vue'
import VehicleSearchBar from './VehicleSearchBar.vue'
import { MOCK_MARKET_LISTINGS } from '@/data/home/marketplace-mock'

const router = useRouter()

function scrollToSearch(): void {
  document.getElementById('home-search')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

const actions: QuickAction[] = [
  { icon: Search, label: '車輛查詢', to: null, onClick: scrollToSearch },
  { icon: ShoppingBag, label: '交易市場', to: '/marketplace' },
  { icon: ShieldCheck, label: '驗證報告', to: '/reports' },
  // Buyer 現場複驗 — same verification mechanism as Seller's, just
  // type=buyer instead of type=seller (see VerificationView's presetType).
  { icon: Camera, label: '開始驗車', to: '/verification?type=buyer' },
]
</script>

<template>
  <div class="buyer-home">
    <HomeHero
      role="buyer"
      brand="MotoVerify"
      :title="['買得安心', '看得更清楚']"
      description="查看驗證紀錄，再決定要不要去看車。"
      primary-label="尋找車輛"
      secondary-label="查看交易市場"
      @primary="scrollToSearch"
      @secondary="router.push('/marketplace')"
    />

    <div id="home-search" class="section">
      <VehicleSearchBar />
    </div>

    <div class="section">
      <QuickActionGrid :actions="actions" />
    </div>

    <div class="section">
      <div class="section-header">
        <h2>熱門車輛</h2>
        <RouterLink to="/marketplace" class="see-all">查看全部 →</RouterLink>
      </div>
      <VehicleCarousel :listings="MOCK_MARKET_LISTINGS" />
    </div>
  </div>
</template>

<style scoped>
.buyer-home {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  padding-bottom: var(--space-lg);
}

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

.see-all {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--color-primary);
  text-decoration: none;
}
</style>
