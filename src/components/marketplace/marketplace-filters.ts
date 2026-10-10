export type MarketplaceSortOption = 'price-desc' | 'price-asc'
export type PowerTypeFilter = 'all' | 'gasoline' | 'electric'

// Comfortably covers every current listing (seeded DEMO + real 我的刊登,
// roughly NT$45,000–285,000) with headroom to spare. The top of the range
// means "or more" rather than a hard ceiling — see PRICE_FILTER_MAX's use in
// MarketplaceView.vue's price filter — so a future higher-priced listing is
// never silently hidden just because the slider defaults to this span.
export const PRICE_FILTER_MIN = 0
export const PRICE_FILTER_MAX = 500000
export const PRICE_FILTER_STEP = 10000

/** Taiwan motorcycle registration plate colors — a de facto standard
 * displacement categorization buyers already think in, rather than a raw
 * cc range slider. Boundaries are lower-inclusive/upper-exclusive across the
 * board (green/white/yellow) so every cc value falls into exactly one
 * bucket, red being the open-ended top. */
export type PlateColor = 'green' | 'white' | 'yellow' | 'red'

export const PLATE_COLOR_OPTIONS: { value: PlateColor; label: string; range: string }[] = [
  { value: 'green', label: '綠牌', range: '< 50cc' },
  { value: 'white', label: '白牌', range: '50–250cc' },
  { value: 'yellow', label: '黃牌', range: '250–550cc' },
  { value: 'red', label: '紅牌', range: '550cc+' },
]

export function matchesPlateColor(displacementCc: number, plate: PlateColor): boolean {
  switch (plate) {
    case 'green':
      return displacementCc < 50
    case 'white':
      return displacementCc >= 50 && displacementCc < 250
    case 'yellow':
      return displacementCc >= 250 && displacementCc < 550
    case 'red':
      return displacementCc >= 550
  }
}

/** Vehicle brand is free text — VehicleModelSelect.vue's manual-entry
 * fallback (used when a vehicle isn't picked from the 車輛選單資訊 catalog)
 * has no casing enforcement, so the same real-world brand can land in
 * Firestore as "YAMAHA" on one listing and "Yamaha" on another. "YAMAHA" and
 * "Yamaha" are the same brand to a buyer, so both the filter chip list
 * (MarketplaceView.vue's brandOptions) and the match itself compare on this
 * normalized form rather than the raw stored string — fixes existing
 * inconsistent data too, no migration needed. */
export function normalizeBrand(brand: string): string {
  return brand.trim().toUpperCase()
}

export interface MarketplaceFilters {
  sortBy: MarketplaceSortOption
  priceRange: [number, number]
  /** null = 全部排氣量（不限牌照類別）. */
  plateColor: PlateColor | null
  /** null = 全部（不限車型類別）. Options are derived from live listing data
   * (MarketplaceView.vue), not a fixed enum — see admin/sections/
   * ModelsSection.vue's bodyType field, which is itself free-text. */
  bodyType: string | null
  powerType: PowerTypeFilter
  /** null = 全部廠牌. Always a normalizeBrand()-ed value — see that
   * function's doc comment. */
  brand: string | null
}

export const DEFAULT_MARKETPLACE_FILTERS: MarketplaceFilters = {
  sortBy: 'price-desc',
  priceRange: [PRICE_FILTER_MIN, PRICE_FILTER_MAX],
  plateColor: null,
  bodyType: null,
  powerType: 'all',
  brand: null,
}
