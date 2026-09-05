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
/** Point-in-time copy of the backing vehicle's public facts, captured when a
 * listing is published — never live-joined back to the private `vehicles`
 * doc afterward (spec §12). Never includes licensePlate/engineNumber/
 * chassisNumber/registrationDocumentUrl/currentOwnerId. */
export interface VehicleSnapshot {
  brand: string
  model: string
  manufactureYear: number | null
  displacementCc: number
  transmission: string
  color: string
  mileage: number
  modified: boolean
  /** Hotlinked URLs for seeded DEMO listings; Firebase Storage download URLs
   * (public `marketplace/{listingId}/...` path — see storage.rules) for real
   * user-submitted listings. First entry is the cover photo. */
  photos: string[]
}

export interface MockMarketListing {
  id: string
  status: 'draft' | 'published'
  /** Which completed Verification(s) back this listing — empty on the
   * seeded DEMO listings, which have no real inspection behind them.
   * publish() flips isPublic=true on every id in here. */
  verificationIds: string[]
  priceTwd: number
  region: string
  district: string
  transferable: boolean
  vehicleSnapshot: VehicleSnapshot
  sellerType: 'individual' | 'dealer'
  sellerName: string
  sellerRating: number
  sellerReviewCount: number
  /** Snapshotted at publish time from the backing verification's answers
   * (same "% normal among eligible" formula used throughout this app) —
   * not live-recomputed on every read, same reasoning as vehicleSnapshot
   * itself. Seeded DEMO listings keep their originally-authored value. */
  verificationScore: number
  /** Real test-account UID this listing's "聊聊" button opens a conversation
   * with — reuses the 3 seeded test accounts (docs/test-accounts.md) rather
   * than a fictional seller with no real Firestore Auth user behind it. */
  sellerId?: string
  /** Seller-written free text — only present on real user-submitted listings
   * (see listing.service.ts), absent on the seeded DEMO listings. */
  description?: string
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
  /** Denormalized count of `users/{uid}/favoriteListings/{listingId}` docs
   * pointing at this listing — kept in sync transactionally by
   * listingService.addFavorite/removeFavorite (mirrors discussionPosts'
   * likeCount pattern). Absent on older seeded docs; treat as 0. */
  favoriteCount?: number
  /** Denormalized count of pending+approved appointments — kept in sync by
   * listingService.createAppointment/updateAppointmentStatus. */
  appointmentCount?: number
  createdAt?: number
  publishedAt?: number | null
}

// The 3 seeded test accounts (docs/test-accounts.md) — 'individual' listings
// route 聊聊 to 測試賣家, 'dealer' listings to MotoVerify 車商.
const SELLER_UID = 'C4Rn3b9vpoXn2mRoL8WJUnFOg9k1'
const DEALER_UID = 'WfRtacVURlSxRIrrtBsVX7E651c2'

export const MOCK_MARKET_LISTINGS: MockMarketListing[] = [
  {
    id: 'demo-1',
    status: 'published',
    verificationIds: [],
    priceTwd: 68000,
    region: '台北市',
    district: '大安區',
    transferable: true,
    vehicleSnapshot: {
      brand: 'YAMAHA',
      model: 'NMAX',
      manufactureYear: 2023,
      mileage: 12500,
      displacementCc: 155,
      transmission: 'CVT 無段變速',
      color: '曜石灰',
      modified: false,
      photos: [
        'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Yamaha_nmax_cpd150_YCP.JPG/960px-Yamaha_nmax_cpd150_YCP.JPG',
      ],
    },
    sellerType: 'individual',
    sellerName: '小林',
    sellerId: SELLER_UID,
    sellerRating: 4.9,
    sellerReviewCount: 21,
    verificationScore: 92,
  },
  {
    id: 'demo-2',
    status: 'published',
    verificationIds: [],
    priceTwd: 145000,
    region: '新北市',
    district: '板橋區',
    transferable: true,
    vehicleSnapshot: {
      brand: 'HONDA',
      model: 'CB300R',
      manufactureYear: 2022,
      mileage: 8300,
      displacementCc: 286,
      transmission: '6速手排',
      color: '珍珠白',
      modified: false,
      photos: [
        'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/2022_Honda_CB300R.png/960px-2022_Honda_CB300R.png',
      ],
    },
    sellerType: 'dealer',
    sellerName: '極速車行',
    sellerId: DEALER_UID,
    sellerRating: 4.6,
    sellerReviewCount: 96,
    verificationScore: 85,
  },
  {
    id: 'demo-3',
    status: 'published',
    verificationIds: [],
    priceTwd: 112000,
    region: '台中市',
    district: '西區',
    transferable: false,
    vehicleSnapshot: {
      brand: 'KYMCO',
      model: 'KRV 180',
      manufactureYear: 2022,
      mileage: 7200,
      displacementCc: 180,
      transmission: 'CVT 無段變速',
      color: '琉璃藍',
      modified: true,
      photos: [
        'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/2021_Kymco_KRV_Type_S.jpg/960px-2021_Kymco_KRV_Type_S.jpg',
      ],
    },
    sellerType: 'individual',
    sellerName: '美玲',
    sellerId: SELLER_UID,
    sellerRating: 4.3,
    sellerReviewCount: 5,
    verificationScore: 71,
  },
  {
    id: 'demo-4',
    status: 'published',
    verificationIds: [],
    priceTwd: 52000,
    region: '高雄市',
    district: '左營區',
    transferable: true,
    vehicleSnapshot: {
      brand: 'SYM',
      model: 'JET SR',
      manufactureYear: 2021,
      mileage: 15800,
      displacementCc: 150,
      transmission: 'CVT 無段變速',
      color: '消光紅',
      modified: false,
      photos: [
        'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/SYM_Jet_14_in_Avellino.jpg/960px-SYM_Jet_14_in_Avellino.jpg',
      ],
    },
    sellerType: 'individual',
    sellerName: '俊傑',
    sellerId: SELLER_UID,
    sellerRating: 4.8,
    sellerReviewCount: 17,
    verificationScore: 88,
  },
  {
    id: 'demo-5',
    status: 'published',
    verificationIds: [],
    priceTwd: 79000,
    region: '桃園市',
    district: '中壢區',
    transferable: true,
    vehicleSnapshot: {
      brand: 'YAMAHA',
      model: '勁戰六代',
      manufactureYear: 2021,
      mileage: 18650,
      displacementCc: 155,
      transmission: 'CVT 無段變速',
      color: '競速藍',
      modified: true,
      photos: [
        'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Yamaha_CygnusX.jpg/960px-Yamaha_CygnusX.jpg',
      ],
    },
    sellerType: 'dealer',
    sellerName: '騎士車業',
    sellerId: DEALER_UID,
    sellerRating: 4.8,
    sellerReviewCount: 128,
    verificationScore: 79,
  },
  {
    id: 'demo-6',
    status: 'published',
    verificationIds: [],
    priceTwd: 238000,
    region: '台北市',
    district: '中正區',
    transferable: true,
    vehicleSnapshot: {
      brand: 'YAMAHA',
      model: 'MT-07',
      manufactureYear: 2020,
      mileage: 12300,
      displacementCc: 689,
      transmission: '6速手排',
      color: '消光黑',
      modified: false,
      photos: [
        'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Yamaha_MT-07.jpg/960px-Yamaha_MT-07.jpg',
      ],
    },
    sellerType: 'individual',
    sellerName: '阿凱',
    sellerId: SELLER_UID,
    sellerRating: 4.7,
    sellerReviewCount: 12,
    verificationScore: 88,
  },
]
