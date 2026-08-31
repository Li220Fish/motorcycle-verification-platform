/**
 * DEMO "精選車商" (Featured Dealers) — no dealer directory/profile backend
 * exists yet. Ratings match the same dealer names used as `sellerName` on
 * their listings in marketplace-mock.ts for consistency. Read live from
 * Firestore's `featuredDealers` collection via homeContentService; kept here
 * as the authored reference content scripts/seed-marketplace-mock.mjs
 * mirrors.
 */
export interface MockFeaturedDealer {
  id: string
  name: string
  rating: number
  reviewCount: number
  region: string
}

export const MOCK_FEATURED_DEALERS: MockFeaturedDealer[] = [
  { id: 'dealer-1', name: '騎士車業', rating: 4.8, reviewCount: 128, region: '台北市' },
  { id: 'dealer-2', name: '極速車行', rating: 4.6, reviewCount: 96, region: '新北市' },
  { id: 'dealer-3', name: '安心車業', rating: 4.9, reviewCount: 64, region: '台中市' },
  { id: 'dealer-4', name: '雙輪車坊', rating: 4.5, reviewCount: 42, region: '高雄市' },
]
