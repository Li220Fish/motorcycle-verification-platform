/**
 * Dev/QA-only seed script for the Home/Marketplace DEMO content — pushes
 * MOCK_MARKET_LISTINGS / MOCK_FEATURED_DEALERS / MOCK_MY_LISTINGS /
 * MOCK_VEHICLE_NEWS into their own Firestore collections
 * (marketplaceListings / featuredDealers / myListings / vehicleNews) instead
 * of leaving them as static arrays baked into the JS bundle, so the app can
 * read (and this content can be updated) without a rebuild.
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
 * Uses the Firebase client SDK only, no Admin SDK / service account key.
 * Same production guard as scripts/seed-test-users.mjs.
 *
 * Usage:
 *   ALLOW_TEST_SEED=true node scripts/seed-marketplace-mock.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getFirestore, writeBatch } from 'firebase/firestore'

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

// --- Mirrors src/data/home/featured-dealers-mock.ts ---
const FEATURED_DEALERS = [
  { id: 'dealer-1', name: '騎士車業', rating: 4.8, reviewCount: 128, region: '台北市' },
  { id: 'dealer-2', name: '極速車行', rating: 4.6, reviewCount: 96, region: '新北市' },
  { id: 'dealer-3', name: '安心車業', rating: 4.9, reviewCount: 64, region: '台中市' },
  { id: 'dealer-4', name: '雙輪車坊', rating: 4.5, reviewCount: 42, region: '高雄市' },
]

// --- Mirrors src/data/home/my-listings-mock.ts ---
const MY_LISTINGS = [
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

// --- Mirrors src/data/home/vehicle-news-mock.ts ---
const VEHICLE_NEWS = [
  {
    id: 'news-1',
    title: '新版機車強制險費率 9 月調整，多數車主保費將小幅下降',
    category: '政策',
    source: '交通部路政司',
    relativeTime: '3 小時前',
  },
  {
    id: 'news-2',
    title: 'GOGORO 發表新款車電系統，換電效率提升 15%',
    category: '新車',
    source: '車界新知',
    relativeTime: '昨天',
  },
  {
    id: 'news-3',
    title: '雨季將至，騎士協會呼籲定期檢查輪胎胎紋深度',
    category: '安全',
    source: '騎士安全聯盟',
    relativeTime: '2 天前',
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
  await signInWithEmailAndPassword(auth, 'seller@motoverify.test', 'MotoVerify123!')

  console.log(`[seed-marketplace-mock] Seeding into Firebase project: ${firebaseConfig.projectId}`)

  await seedCollection(db, 'marketplaceListings', MARKETPLACE_LISTINGS)
  console.log(`[seed-marketplace-mock] marketplaceListings: ${MARKETPLACE_LISTINGS.length} docs`)

  await seedCollection(db, 'featuredDealers', FEATURED_DEALERS)
  console.log(`[seed-marketplace-mock] featuredDealers: ${FEATURED_DEALERS.length} docs`)

  await seedCollection(db, 'myListings', MY_LISTINGS)
  console.log(`[seed-marketplace-mock] myListings: ${MY_LISTINGS.length} docs`)

  await seedCollection(db, 'vehicleNews', VEHICLE_NEWS)
  console.log(`[seed-marketplace-mock] vehicleNews: ${VEHICLE_NEWS.length} docs`)

  console.log('[seed-marketplace-mock] Done.')
  process.exit(0)
}

main().catch((error) => {
  console.error('[seed-marketplace-mock] Failed:', error)
  process.exit(1)
})
