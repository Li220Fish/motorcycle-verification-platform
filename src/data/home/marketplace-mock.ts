/**
 * DEMO marketplace listings — the real Marketplace/transaction backend does
 * not exist yet (§41 of the Home redesign spec). Every card sourced from
 * this content must be visibly labelled DEMO in the UI so it can never be
 * mistaken for a real listing.
 *
 * Every listing requires a passing MotoVerify inspection before it can go
 * live, so "已驗證" is no longer a per-card differentiator (there's no such
 * field) — the verification report itself still shows on the detail page.
 * `sellerType` distinguishes a private seller from a dealer/shop (車行),
 * which DOES get its own badge on the card.
 *
 * The array below is kept as the authored reference content — the app
 * itself reads this collection live from Firestore (`marketplaceListings`,
 * via homeContentService) so multiple screens share one source and it's
 * seedable independently of a rebuild. Re-seed with:
 *   ALLOW_TEST_SEED=true node scripts/seed-marketplace-mock.mjs
 * (that script mirrors this array by hand — Node can't import this
 * '@/'-aliased .ts file directly, see its own header comment).
 */
export interface MockMarketListing {
  id: string
  brand: string
  model: string
  year: number
  mileageKm: number
  priceTwd: number
  region: string
  district: string
  transferable: boolean
  displacementCc: number
  transmission: string
  color: string
  modified: boolean
  sellerType: 'individual' | 'dealer'
  sellerName: string
  sellerRating: number
  sellerReviewCount: number
  verificationScore: number
  /** Real hotlinked photo (Wikimedia Commons) — falls back to a generic icon
   * placeholder in the UI when absent. Doubles as the cover photo for
   * real user-submitted listings (see `photos` below). */
  imageUrl?: string
  /** Real test-account UID this listing's "聊聊" button opens a conversation
   * with — reuses the 3 seeded test accounts (docs/test-accounts.md) rather
   * than a fictional seller with no real Firestore Auth user behind it. */
  sellerId?: string
  /** Seller-written free text — only present on real user-submitted listings
   * (see listing.service.ts), absent on the seeded DEMO listings. */
  description?: string
  /** Additional gallery photos beyond the cover `imageUrl`, uploaded via
   * Firebase Storage — only present on real user-submitted listings. */
  photos?: string[]
  /** Links back to the seller's own vehicle (see types/vehicle.ts) this
   * listing was published from — only present on real user-submitted
   * listings, absent on the seeded DEMO listings which have no backing
   * vehicle record. */
  vehicleId?: string
  /** Dates ('YYYY-MM-DD') the seller has opened for viewing appointments —
   * set on the listing management page, shown highlighted on the buyer's
   * booking calendar. Only present on real user-submitted listings. */
  availableDates?: string[]
  /** Time-of-day slots (e.g. '10:00') offered on every date in
   * `availableDates` — one shared set rather than per-date custom times,
   * to keep the seller's setup to a single toggle list. */
  timeSlots?: string[]
}

// The 3 seeded test accounts (docs/test-accounts.md) — 'individual' listings
// route 聊聊 to 測試賣家, 'dealer' listings to MotoVerify 車商.
const SELLER_UID = 'C4Rn3b9vpoXn2mRoL8WJUnFOg9k1'
const DEALER_UID = 'WfRtacVURlSxRIrrtBsVX7E651c2'

export const MOCK_MARKET_LISTINGS: MockMarketListing[] = [
  {
    id: 'demo-1',
    brand: 'YAMAHA',
    model: 'NMAX',
    year: 2023,
    mileageKm: 12500,
    priceTwd: 68000,
    region: '台北市',
    district: '大安區',
    transferable: true,
    displacementCc: 155,
    transmission: 'CVT 無段變速',
    color: '曜石灰',
    modified: false,
    sellerType: 'individual',
    sellerName: '小林',
    sellerId: SELLER_UID,
    sellerRating: 4.9,
    sellerReviewCount: 21,
    verificationScore: 92,
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Yamaha_nmax_cpd150_YCP.JPG/960px-Yamaha_nmax_cpd150_YCP.JPG',
  },
  {
    id: 'demo-2',
    brand: 'HONDA',
    model: 'CB300R',
    year: 2022,
    mileageKm: 8300,
    priceTwd: 145000,
    region: '新北市',
    district: '板橋區',
    transferable: true,
    displacementCc: 286,
    transmission: '6速手排',
    color: '珍珠白',
    modified: false,
    sellerType: 'dealer',
    sellerName: '極速車行',
    sellerId: DEALER_UID,
    sellerRating: 4.6,
    sellerReviewCount: 96,
    verificationScore: 85,
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/2022_Honda_CB300R.png/960px-2022_Honda_CB300R.png',
  },
  {
    id: 'demo-3',
    brand: 'KYMCO',
    model: 'KRV 180',
    year: 2022,
    mileageKm: 7200,
    priceTwd: 112000,
    region: '台中市',
    district: '西區',
    transferable: false,
    displacementCc: 180,
    transmission: 'CVT 無段變速',
    color: '琉璃藍',
    modified: true,
    sellerType: 'individual',
    sellerName: '美玲',
    sellerId: SELLER_UID,
    sellerRating: 4.3,
    sellerReviewCount: 5,
    verificationScore: 71,
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/2021_Kymco_KRV_Type_S.jpg/960px-2021_Kymco_KRV_Type_S.jpg',
  },
  {
    id: 'demo-4',
    brand: 'SYM',
    model: 'JET SR',
    year: 2021,
    mileageKm: 15800,
    priceTwd: 52000,
    region: '高雄市',
    district: '左營區',
    transferable: true,
    displacementCc: 150,
    transmission: 'CVT 無段變速',
    color: '消光紅',
    modified: false,
    sellerType: 'individual',
    sellerName: '俊傑',
    sellerId: SELLER_UID,
    sellerRating: 4.8,
    sellerReviewCount: 17,
    verificationScore: 88,
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/SYM_Jet_14_in_Avellino.jpg/960px-SYM_Jet_14_in_Avellino.jpg',
  },
  {
    id: 'demo-5',
    brand: 'YAMAHA',
    model: '勁戰六代',
    year: 2021,
    mileageKm: 18650,
    priceTwd: 79000,
    region: '桃園市',
    district: '中壢區',
    transferable: true,
    displacementCc: 155,
    transmission: 'CVT 無段變速',
    color: '競速藍',
    modified: true,
    sellerType: 'dealer',
    sellerName: '騎士車業',
    sellerId: DEALER_UID,
    sellerRating: 4.8,
    sellerReviewCount: 128,
    verificationScore: 79,
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Yamaha_CygnusX.jpg/960px-Yamaha_CygnusX.jpg',
  },
  {
    id: 'demo-6',
    brand: 'YAMAHA',
    model: 'MT-07',
    year: 2020,
    mileageKm: 12300,
    priceTwd: 238000,
    region: '台北市',
    district: '中正區',
    transferable: true,
    displacementCc: 689,
    transmission: '6速手排',
    color: '消光黑',
    modified: false,
    sellerType: 'individual',
    sellerName: '阿凱',
    sellerId: SELLER_UID,
    sellerRating: 4.7,
    sellerReviewCount: 12,
    verificationScore: 88,
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Yamaha_MT-07.jpg/960px-Yamaha_MT-07.jpg',
  },
]
