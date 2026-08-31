/**
 * DEMO "我的刊登" listings — the real "list my vehicle on the marketplace"
 * feature (submission, review, buyer interest tracking) does not exist yet.
 * Mirrors the mock-data pattern already used for marketplace-mock.ts — read
 * live from Firestore's `myListings` collection via homeContentService, kept
 * here as the authored reference content scripts/seed-marketplace-mock.mjs
 * mirrors.
 */
export interface MockMyListing {
  id: string
  brand: string
  model: string
  year: number
  priceTwd: number
  status: 'reviewing' | 'active'
  interestCount: number
  imageUrl?: string
}

export const MOCK_MY_LISTINGS: MockMyListing[] = [
  {
    id: 'my-listing-1',
    brand: 'HONDA',
    model: 'CB300R',
    year: 2017,
    priceTwd: 150000,
    status: 'active',
    interestCount: 14,
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Honda_CB300R_-_Mondial_de_l%27Automobile_de_Paris_2018_-_001.jpg/960px-Honda_CB300R_-_Mondial_de_l%27Automobile_de_Paris_2018_-_001.jpg',
  },
  {
    id: 'my-listing-2',
    brand: 'YAMAHA',
    model: 'SMAX 155',
    year: 2018,
    priceTwd: 62000,
    status: 'active',
    interestCount: 7,
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Yamaha_SMax.jpg/960px-Yamaha_SMax.jpg',
  },
]
