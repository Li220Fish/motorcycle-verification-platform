export type SellerTypeFilter = 'all' | 'individual' | 'dealer'
export type MarketplaceSortOption =
  'default' | 'price-asc' | 'price-desc' | 'mileage-asc' | 'score-desc'

// Comfortably covers every current listing (seeded DEMO + real 我的刊登,
// roughly NT$45,000–285,000) with headroom to spare. The top of the range
// means "or more" rather than a hard ceiling — see PRICE_FILTER_MAX's use in
// MarketplaceView.vue's price filter — so a future higher-priced listing is
// never silently hidden just because the slider defaults to this span.
export const PRICE_FILTER_MIN = 0
export const PRICE_FILTER_MAX = 500000
export const PRICE_FILTER_STEP = 10000

export interface MarketplaceFilters {
  sellerType: SellerTypeFilter
  transferableOnly: boolean
  sortBy: MarketplaceSortOption
  priceRange: [number, number]
}

export const DEFAULT_MARKETPLACE_FILTERS: MarketplaceFilters = {
  sellerType: 'all',
  transferableOnly: false,
  sortBy: 'default',
  priceRange: [PRICE_FILTER_MIN, PRICE_FILTER_MAX],
}
