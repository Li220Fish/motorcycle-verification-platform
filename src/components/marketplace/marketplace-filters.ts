export type SellerTypeFilter = 'all' | 'individual' | 'dealer'
export type MarketplaceSortOption =
  'default' | 'price-asc' | 'price-desc' | 'mileage-asc' | 'score-desc'

export interface MarketplaceFilters {
  sellerType: SellerTypeFilter
  transferableOnly: boolean
  sortBy: MarketplaceSortOption
}

export const DEFAULT_MARKETPLACE_FILTERS: MarketplaceFilters = {
  sellerType: 'all',
  transferableOnly: false,
  sortBy: 'default',
}
