<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Search, SlidersHorizontal } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import AppHeader from '@/components/common/AppHeader.vue'
// 精選車商 — temporarily disabled (not deleted, may come back), see the
// <FeaturedDealersSection> usage below for the matching commented-out spot.
// import FeaturedDealersSection from '@/components/home/FeaturedDealersSection.vue'
import VehicleMarketRow from '@/components/home/VehicleMarketRow.vue'
import MarketplaceFilterSheet from '@/components/marketplace/MarketplaceFilterSheet.vue'
import {
  DEFAULT_MARKETPLACE_FILTERS,
  matchesPlateColor,
  normalizeBrand,
  PRICE_FILTER_MAX,
  type MarketplaceFilters,
} from '@/components/marketplace/marketplace-filters'
import { useI18n } from '@/composables/useI18n'
import { homeContentService } from '@/services/firebase/home-content.service'
import { listingService } from '@/services/firebase/listing.service'
import { useAuthStore } from '@/stores/auth.store'
import type { MockMarketListing } from '@/data/home/marketplace-mock'

const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()
const allListings = ref<MockMarketListing[]>([])
const searchQuery = ref('')
const filterSheetOpen = ref(false)
const filters = ref<MarketplaceFilters>({ ...DEFAULT_MARKETPLACE_FILTERS })

type Tab = 'market' | 'favorites'
const activeTab = ref<Tab>('market')
const favoriteIds = ref<Set<string>>(new Set())

onMounted(async () => {
  allListings.value = await homeContentService.listMarketplaceListings()
  if (authStore.user) {
    favoriteIds.value = new Set(await listingService.listFavoriteIds(authStore.user.id))
  }
})

async function handleToggleFavorite(listingId: string): Promise<void> {
  if (!authStore.user) return
  const uid = authStore.user.id
  const next = new Set(favoriteIds.value)
  if (next.has(listingId)) {
    next.delete(listingId)
    favoriteIds.value = next
    await listingService.removeFavorite(uid, listingId)
  } else {
    next.add(listingId)
    favoriteIds.value = next
    await listingService.addFavorite(uid, listingId)
  }
}

const activeFilterCount = computed(() => {
  let count = 0
  if (
    filters.value.priceRange[0] !== DEFAULT_MARKETPLACE_FILTERS.priceRange[0] ||
    filters.value.priceRange[1] !== DEFAULT_MARKETPLACE_FILTERS.priceRange[1]
  ) {
    count += 1
  }
  if (filters.value.plateColor !== null) count += 1
  if (filters.value.powerType !== 'all') count += 1
  if (filters.value.bodyType !== null) count += 1
  if (filters.value.brand !== null) count += 1
  return count
})

// Chip options for the filter sheet — derived from whatever's actually
// loaded rather than a fixed enum, since 車型類別/廠牌 are both
// admin-authored free text (see admin/sections/ModelsSection.vue).
const bodyTypeOptions = computed(() =>
  Array.from(
    new Set(
      allListings.value
        .map((listing) => listing.vehicleSnapshot.bodyType)
        .filter((v): v is string => !!v),
    ),
  ).sort(),
)
const brandOptions = computed(() =>
  Array.from(
    new Set(allListings.value.map((listing) => normalizeBrand(listing.vehicleSnapshot.brand))),
  ).sort(),
)

// All client-side over the already-fetched DEMO listings — no backend
// search/filter exists (or is needed) for a fixed mock dataset this size.
const listings = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()
  let result = allListings.value.filter((listing) => {
    if (activeTab.value === 'favorites' && !favoriteIds.value.has(listing.id)) return false
    if (keyword) {
      const haystack =
        `${listing.vehicleSnapshot.brand} ${listing.vehicleSnapshot.model} ${listing.region} ${listing.district}`.toLowerCase()
      if (!haystack.includes(keyword)) return false
    }
    const [priceMin, priceMax] = filters.value.priceRange
    if (listing.priceTwd < priceMin) return false
    // priceMax at the slider's own ceiling means "or more" (see
    // marketplace-filters.ts), not a hard cap — otherwise a listing priced
    // above PRICE_FILTER_MAX would be hidden by leaving the slider untouched.
    if (priceMax < PRICE_FILTER_MAX && listing.priceTwd > priceMax) return false

    if (
      filters.value.plateColor !== null &&
      !matchesPlateColor(listing.vehicleSnapshot.displacementCc, filters.value.plateColor)
    )
      return false

    if (
      filters.value.powerType !== 'all' &&
      listing.vehicleSnapshot.powerType !== filters.value.powerType
    )
      return false
    // Missing bodyType/powerType (a listing published before these fields
    // existed) never matches a specific filter selection — see
    // VehicleSnapshot.bodyType's doc comment in marketplace-mock.ts for why
    // "pass through" would be worse than "not filterable yet" here.
    if (
      filters.value.bodyType !== null &&
      listing.vehicleSnapshot.bodyType !== filters.value.bodyType
    )
      return false
    if (
      filters.value.brand !== null &&
      normalizeBrand(listing.vehicleSnapshot.brand) !== filters.value.brand
    )
      return false
    return true
  })
  switch (filters.value.sortBy) {
    case 'price-asc':
      result = [...result].sort((a, b) => a.priceTwd - b.priceTwd)
      break
    case 'price-desc':
      result = [...result].sort((a, b) => b.priceTwd - a.priceTwd)
      break
  }
  return result
})
</script>

<template>
  <div>
    <AppHeader :title="t('marketplace', 'title')" />

    <div class="content">
      <div class="tab-row">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'market' }"
          @click="activeTab = 'market'"
        >
          {{ t('marketplace', 'tabMarket') }}
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'favorites' }"
          @click="activeTab = 'favorites'"
        >
          {{ t('marketplace', 'tabFavorites') }}
        </button>
      </div>

      <div class="search-row">
        <div class="search-bar">
          <Search :size="18" color="var(--color-text-disabled)" />
          <input
            v-model="searchQuery"
            type="search"
            :placeholder="t('marketplace', 'searchPlaceholder')"
            :aria-label="t('marketplace', 'searchPlaceholder')"
          />
        </div>
        <button
          class="filter-btn"
          :class="{ active: activeFilterCount > 0 }"
          :aria-label="t('marketplace', 'filter')"
          @click="filterSheetOpen = true"
        >
          <SlidersHorizontal :size="18" />
          <span v-if="activeFilterCount > 0" class="filter-badge">{{ activeFilterCount }}</span>
        </button>
      </div>

      <p v-if="activeTab === 'favorites' && listings.length === 0" class="empty-hint">
        {{ t('marketplace', 'emptyFavorites') }}
      </p>
      <p v-else-if="allListings.length > 0 && listings.length === 0" class="empty-hint">
        {{ t('marketplace', 'emptyFiltered') }}
      </p>

      <!-- Main list: horizontal row, image left — image should carry more
           weight than a squeezed 2-col grid, and a row reads faster when
           comparing price/mileage across cards (P1 §08 of the UX report). -->
      <div class="list">
        <div
          v-for="listing in listings"
          :key="listing.id"
          class="list-item"
          @click="router.push(`/marketplace/${listing.id}`)"
        >
          <VehicleMarketRow
            :listing="listing"
            :is-favorite="favoriteIds.has(listing.id)"
            @toggle-favorite="handleToggleFavorite(listing.id)"
          />
        </div>
      </div>

      <!-- 精選車商 — temporarily disabled (not deleted, may come back).
      <FeaturedDealersSection v-if="activeTab === 'market'" />
      -->
    </div>

    <MarketplaceFilterSheet
      v-model="filters"
      :open="filterSheetOpen"
      :body-type-options="bodyTypeOptions"
      :brand-options="brandOptions"
      @close="filterSheetOpen = false"
    />
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

.tab-row {
  display: flex;
  gap: 6px;
  padding: 4px;
  background: var(--color-background);
  border-radius: var(--radius-lg);
}

.tab-btn {
  flex: 1;
  height: 38px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 14px;
  font-weight: 700;
}

.tab-btn.active {
  background: var(--color-surface);
  color: var(--color-primary);
  box-shadow: var(--shadow-card);
}

.search-row {
  display: flex;
  gap: var(--space-sm);
}

.search-bar {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  height: 48px;
  padding: 0 var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.search-bar input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  font-size: 14.5px;
  color: var(--color-text-primary);
  background: transparent;
}

.search-bar input::placeholder {
  color: var(--color-text-disabled);
}

.filter-btn {
  position: relative;
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.filter-btn.active {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.filter-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 16px;
  height: 16px;
  padding: 0 3px;
  border-radius: 999px;
  background: var(--color-primary);
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-hint {
  text-align: center;
  font-size: 13px;
  color: var(--color-text-secondary);
  padding: var(--space-lg) 0;
  margin: 0;
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.list-item {
  width: 100%;
}
</style>
