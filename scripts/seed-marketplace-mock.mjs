/**
 * Dev/QA-only seed script for the Home/Marketplace DEMO content — pushes
 * MOCK_MARKET_LISTINGS / MOCK_FEATURED_DEALERS / MOCK_VEHICLE_NEWS into their
 * own Firestore collections (marketplaceListings / featuredDealers /
 * vehicleNews) instead of leaving them as static arrays baked into the JS
 * bundle, so the app can read (and this content can be updated) without a
 * rebuild.
 *
 * "我的刊登" (My Listings) no longer has its own separate mock collection —
 * it's real user data now, scoped by `sellerId` on `marketplaceListings`
 * itself (see src/services/firebase/listing.service.ts and
 * scripts/seed-my-listings.mjs for seeding the 3 test accounts' own
 * listings).
 *
 * This mirrors the arrays in src/data/home/*.ts BY HAND — plain .mjs can't
 * import those '@/'-aliased TS modules directly (same constraint noted in
 * scripts/seed-mock-vehicles.mjs). If those source files change, update the
 * literals below to match.
 *
 * Every doc is written with an explicit id (setDoc, not addDoc) matching the
 * original mock ids (demo-1, dealer-1, ...) so existing routes like
 * /marketplace/demo-1 keep working unchanged. Idempotent — re-running just
 * overwrites the same doc ids.
 *
 * Uses the Firebase client SDK only, signed in as the seeded admin account —
 * these DEMO listings are written directly as `status:'published'` with no
 * backing verification, which only the marketplaceListings create rule's
 * admin branch allows (the seller-authored path requires
 * verificationIds.length>=1 and goes through publish(), neither of which
 * applies to fictional demo content). Same production guard as
 * scripts/seed-test-users.mjs.
 *
 * Usage:
 *   ALLOW_TEST_SEED=true node scripts/seed-marketplace-mock.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getFirestore, Timestamp, writeBatch } from 'firebase/firestore'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return {}
  const result = {}
  for (const line of readFileSync(filePath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    result[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return result
}

function guardEnvironment() {
  if (process.env.NODE_ENV === 'production') {
    console.error('[seed-marketplace-mock] Refusing to run: NODE_ENV=production.')
    process.exit(1)
  }
  if (process.env.ALLOW_TEST_SEED !== 'true') {
    console.error(
      '[seed-marketplace-mock] Refusing to run: set ALLOW_TEST_SEED=true to confirm this is a dev/QA environment.',
    )
    process.exit(1)
  }
}

// The 3 seeded test accounts (docs/test-accounts.md) — 'individual' listings
// route 聊聊 to 測試賣家, 'dealer' listings to MotoVerify 車商.
const SELLER_UID = 'C4Rn3b9vpoXn2mRoL8WJUnFOg9k1'
const DEALER_UID = 'WfRtacVURlSxRIrrtBsVX7E651c2'

// --- Mirrors src/data/home/marketplace-mock.ts ---
const MARKETPLACE_LISTINGS = [
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

// --- Mirrors src/data/home/featured-dealers-mock.ts ---
const FEATURED_DEALERS = [
  { id: 'dealer-1', name: '騎士車業', rating: 4.8, reviewCount: 128, region: '台北市' },
  { id: 'dealer-2', name: '極速車行', rating: 4.6, reviewCount: 96, region: '新北市' },
  { id: 'dealer-3', name: '安心車業', rating: 4.9, reviewCount: 64, region: '台中市' },
  { id: 'dealer-4', name: '雙輪車坊', rating: 4.5, reviewCount: 42, region: '高雄市' },
]

// --- Mirrors src/data/home/vehicle-news-mock.ts ---
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const VEHICLE_NEWS = [
  {
    id: 'news-1',
    title: '新版機車強制險費率 9 月調整，多數車主保費將小幅下降',
    summary: '交通部路政司公告新版強制險費率，多數 150 c.c. 以下車款保費小幅下降。',
    category: '政策',
    sourceName: '交通部路政司',
    publishedAt: Timestamp.fromMillis(Date.now() - 3 * HOUR_MS),
    content:
      '交通部路政司今日公告，新版機車強制汽車責任保險費率將自 9 月 1 日起調整，依車輛排氣量級距與肇事率統計重新試算，多數 150 c.c. 以下速可達與檔車的保費將小幅下降，250 c.c. 以上重型機車則因肇事理賠金額上升，費率維持不變或小幅上升。\n\n路政司表示，強制險費率每年會依前一年度的理賠經驗值檢討，此次調整主要反映近年速可達事故理賠件數下降的趨勢。車主續保時系統將自動套用新費率，不需要另外申請，實際金額仍會依車輛的排氣量、使用地區與過去理賠紀錄而有所不同。\n\n監理站也提醒車主，強制險僅涵蓋對方人身傷害的基本保障，若要涵蓋自身車損或第三方財損，仍需另外投保第三人責任險或車體險。',
  },
  {
    id: 'news-2',
    title: 'GOGORO 發表新款車電系統，換電效率提升 15%',
    summary: 'GOGORO 新一代車電系統換電效率提升 15%，優先於雙北、台中部署。',
    category: '新車',
    sourceName: '車界新知',
    publishedAt: Timestamp.fromMillis(Date.now() - 1 * DAY_MS),
    content:
      'GOGORO 昨日發表新一代車電系統，透過重新設計的電池艙與充電迴路，換電站單次換電效率較前代提升約 15%，尖峰時段排隊等待時間可望明顯縮短。新系統預計優先於雙北、台中等 GoStation 密度較高的都會區部署，其餘縣市則採分階段更新。\n\n除了換電效率，這套系統也同步優化了電池健康度回報機制，車主可在 App 上看到更精細的電池耗損分析，協助判斷是否需要更換車輛的核心動力模組。GOGORO 表示，既有車款可透過原廠回廠更新部分軟體功能，但換電速度提升主要仰賴 GoStation 端的硬體汰換，車主端不需額外付費升級。\n\n業界人士觀察，這次更新是 GOGORO 因應競爭對手電動速可達陸續推出快充方案的回應，換電模式的核心優勢在於「不用等待」，效率提升有助鞏固既有車主的黏著度。',
  },
  {
    id: 'news-3',
    title: '雨季將至，騎士協會呼籲定期檢查輪胎胎紋深度',
    summary: '騎士安全聯盟提醒雨季前檢查胎紋深度與胎壓，降低打滑風險。',
    category: '安全',
    sourceName: '騎士安全聯盟',
    publishedAt: Timestamp.fromMillis(Date.now() - 2 * DAY_MS),
    content:
      '隨著雨季即將到來，騎士安全聯盟提醒所有機車騎士，濕滑路面是機車事故的高風險因素之一，其中輪胎胎紋深度不足是最容易被忽略、卻也最直接影響煞車與過彎安全的項目。聯盟建議車主養成每月自行檢查一次胎紋的習慣，可用十元硬幣邊緣卡入胎紋溝槽，若硬幣邊緣的文字完全露出，代表胎紋已經磨損到需要更換的程度。\n\n除了胎紋深度，胎壓不足或過高同樣會影響雨天抓地力與煞車距離，建議依原廠標示的胎壓值定期檢查，並避免長時間曝曬或超載騎乘加速輪胎老化。聯盟也呼籲，輪胎即使胎紋充足，若已使用超過 3 至 5 年，橡膠本身也會因為老化而變硬、抓地力下降，仍應請專業技師評估是否更換。\n\n此外，雨天騎乘應主動放慢車速、避開路面標線與人孔蓋等濕滑處，並保持與前車的安全距離，以降低打滑風險。',
  },
]

function seedCollection(db, collectionName, items) {
  const batch = writeBatch(db)
  for (const item of items) {
    const { id, ...data } = item
    batch.set(doc(db, collectionName, id), data)
  }
  return batch.commit()
}

async function main() {
  guardEnvironment()

  const envLocal = loadEnvFile(path.join(rootDir, '.env.local'))
  const envDefault = loadEnvFile(path.join(rootDir, '.env'))
  const env = { ...envDefault, ...envLocal, ...process.env }
  const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  }
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error('[seed-marketplace-mock] Missing Firebase config — check .env / .env.local.')
    process.exit(1)
  }

  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db = getFirestore(app)
  await signInWithEmailAndPassword(auth, 'admin@test.com', 'test1234')

  console.log(`[seed-marketplace-mock] Seeding into Firebase project: ${firebaseConfig.projectId}`)

  await seedCollection(db, 'marketplaceListings', MARKETPLACE_LISTINGS)
  console.log(`[seed-marketplace-mock] marketplaceListings: ${MARKETPLACE_LISTINGS.length} docs`)

  await seedCollection(db, 'featuredDealers', FEATURED_DEALERS)
  console.log(`[seed-marketplace-mock] featuredDealers: ${FEATURED_DEALERS.length} docs`)

  await seedCollection(db, 'vehicleNews', VEHICLE_NEWS)
  console.log(`[seed-marketplace-mock] vehicleNews: ${VEHICLE_NEWS.length} docs`)

  console.log('[seed-marketplace-mock] Done.')
  process.exit(0)
}

main().catch((error) => {
  console.error('[seed-marketplace-mock] Failed:', error)
  process.exit(1)
})
