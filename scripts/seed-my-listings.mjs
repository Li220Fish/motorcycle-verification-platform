/**
 * Dev/QA-only seed script ensuring each of the 3 test accounts
 * (docs/test-accounts.md) has at least one real "我的刊登" listing in
 * Firestore's `marketplaceListings` collection — the same collection the
 * Marketplace browse page reads, scoped by `sellerId` for "我的刊登"
 * (see src/services/firebase/listing.service.ts).
 *
 * Each listing is built from one of that account's OWN seeded vehicles
 * (scripts/seed-mock-vehicles.mjs) that already has a completed 車輛驗證 —
 * `verificationScore` is computed for real from that verification's actual
 * answers (% normal, excluding 不適用), not fabricated.
 *
 * Idempotent: replaces any existing listing for the same sellerId+vehicleId
 * pair rather than duplicating on re-run (same pattern as
 * scripts/seed-mock-vehicles.mjs).
 *
 * Uses the Firebase client SDK only, signed in as the seeded admin account —
 * firestore.rules scopes `vehicles`/`verifications` to their owner (+ admin),
 * and a listing's create rule requires `sellerId==caller` OR admin, neither
 * of which a single non-admin sign-in could satisfy across all 3 target
 * accounts at once.
 *
 * Usage:
 *   ALLOW_TEST_SEED=true node scripts/seed-my-listings.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'

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
    console.error('[seed-my-listings] Refusing to run: NODE_ENV=production.')
    process.exit(1)
  }
  if (process.env.ALLOW_TEST_SEED !== 'true') {
    console.error(
      '[seed-my-listings] Refusing to run: set ALLOW_TEST_SEED=true to confirm this is a dev/QA environment.',
    )
    process.exit(1)
  }
}

const SELLER_UID = 'C4Rn3b9vpoXn2mRoL8WJUnFOg9k1'
const DEALER_UID = 'WfRtacVURlSxRIrrtBsVX7E651c2'
const BUYER_UID = 'e399kAhI9PNTmC2RqRT3K6tdiRq1'

const TARGETS = [
  {
    sellerId: SELLER_UID,
    sellerName: '測試賣家',
    sellerType: 'individual',
    vehicleBrand: 'HONDA',
    vehicleModel: 'PCX 160',
    priceTwd: 72000,
    region: '台北市',
    district: '大安區',
    displacementCc: 150,
    transmission: 'CVT 無段變速',
    color: '珍珠白',
    transferable: true,
    modified: false,
    description: '定期保養，車況良好，隨時歡迎預約賞車。',
  },
  {
    sellerId: DEALER_UID,
    sellerName: 'MotoVerify 車商',
    sellerType: 'dealer',
    vehicleBrand: 'KAWASAKI',
    vehicleModel: 'Z900',
    priceTwd: 285000,
    region: '新北市',
    district: '板橋區',
    displacementCc: 948,
    transmission: '6速手排',
    color: '消光黑',
    transferable: true,
    modified: false,
    description: '車商保證車，已完成專業檢驗，可協助貸款與過戶手續。',
  },
  {
    sellerId: BUYER_UID,
    sellerName: '測試買家',
    sellerType: 'individual',
    vehicleBrand: 'KYMCO',
    vehicleModel: 'Agility 125',
    priceTwd: 45000,
    region: '台中市',
    district: '西區',
    displacementCc: 125,
    transmission: 'CVT 無段變速',
    color: '紅色',
    transferable: true,
    modified: false,
    description: '通勤代步車，油耗表現佳，龍頭手把新換。',
  },
]

// Example availability so the 3 seeded listings are immediately bookable —
// every 3rd day for the next 3 weeks, same 5 time slots each day (matches
// the reference design's shared-slots-per-day layout).
function generateAvailableDates(daysAhead, stepDays) {
  const dates = []
  const start = new Date()
  start.setDate(start.getDate() + 1)
  for (let offset = 0; offset < daysAhead; offset += stepDays) {
    const date = new Date(start)
    date.setDate(date.getDate() + offset)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    dates.push(`${year}-${month}-${day}`)
  }
  return dates
}

const DEFAULT_AVAILABLE_DATES = generateAvailableDates(21, 3)
const DEFAULT_TIME_SLOTS = ['10:00', '11:30', '14:00', '16:00', '18:00']

async function findCompletedVerification(db, vehicleId) {
  const verificationsSnapshot = await getDocs(
    query(collection(db, 'verifications'), where('vehicleId', '==', vehicleId)),
  )
  const completed = verificationsSnapshot.docs.find(
    (d) => d.data().type === 'seller' && d.data().status === 'completed',
  )
  if (!completed) return null
  const answersSnapshot = await getDocs(collection(db, 'verifications', completed.id, 'answers'))
  const answers = answersSnapshot.docs.map((d) => d.data())
  const eligible = answers.filter((answer) => answer.result !== 'not_applicable')
  const score =
    eligible.length === 0
      ? 100
      : Math.round(
          (eligible.filter((answer) => answer.result === 'normal').length / eligible.length) * 100,
        )
  return { verificationId: completed.id, score }
}

async function deleteExistingListing(db, sellerId, vehicleId) {
  const snapshot = await getDocs(
    query(
      collection(db, 'marketplaceListings'),
      where('sellerId', '==', sellerId),
      where('vehicleId', '==', vehicleId),
    ),
  )
  for (const listingDoc of snapshot.docs) await deleteDoc(listingDoc.ref)
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
    console.error('[seed-my-listings] Missing Firebase config — check .env / .env.local.')
    process.exit(1)
  }

  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db = getFirestore(app)
  await signInWithEmailAndPassword(auth, 'admin@test.com', 'test1234')

  console.log(`[seed-my-listings] Seeding into Firebase project: ${firebaseConfig.projectId}`)

  const results = []
  for (const target of TARGETS) {
    const vehiclesSnapshot = await getDocs(
      query(collection(db, 'vehicles'), where('currentOwnerId', '==', target.sellerId)),
    )
    const vehicleDoc = vehiclesSnapshot.docs.find(
      (d) => d.data().brand === target.vehicleBrand && d.data().model === target.vehicleModel,
    )
    if (!vehicleDoc) {
      console.warn(
        `[seed-my-listings] Skipped ${target.sellerName}: no ${target.vehicleBrand} ${target.vehicleModel} vehicle found for this owner.`,
      )
      continue
    }
    const vehicle = vehicleDoc.data()
    const completed = await findCompletedVerification(db, vehicleDoc.id)
    if (completed === null) {
      console.warn(
        `[seed-my-listings] Skipped ${target.sellerName}: ${target.vehicleBrand} ${target.vehicleModel} has no completed 車輛驗證.`,
      )
      continue
    }
    const { verificationId, score: verificationScore } = completed

    await deleteExistingListing(db, target.sellerId, vehicleDoc.id)

    const listingId = doc(collection(db, 'marketplaceListings')).id
    await setDoc(doc(db, 'marketplaceListings', listingId), {
      status: 'published',
      vehicleId: vehicleDoc.id,
      verificationIds: [verificationId],
      priceTwd: target.priceTwd,
      region: target.region,
      district: target.district,
      transferable: target.transferable,
      description: target.description,
      vehicleSnapshot: {
        brand: vehicle.brand,
        model: vehicle.model,
        manufactureYear: vehicle.manufactureYear ?? null,
        mileage: vehicle.mileage ?? 0,
        displacementCc: target.displacementCc,
        transmission: target.transmission,
        color: target.color,
        modified: target.modified,
        photos: vehicle.photos ?? [],
      },
      availableDates: DEFAULT_AVAILABLE_DATES,
      timeSlots: DEFAULT_TIME_SLOTS,
      sellerId: target.sellerId,
      sellerName: target.sellerName,
      sellerType: target.sellerType,
      sellerRating: 5,
      sellerReviewCount: 0,
      verificationScore,
      favoriteCount: 0,
      appointmentCount: 0,
      createdAt: serverTimestamp(),
      publishedAt: serverTimestamp(),
    })
    // isPublic must be true for a published listing's report to actually be
    // readable by anyone other than the seller — same invariant
    // listingService.publish() enforces for a real user's own flow.
    await setDoc(doc(db, 'verifications', verificationId), { isPublic: true }, { merge: true })

    results.push({
      seller: target.sellerName,
      vehicle: `${vehicle.brand} ${vehicle.model}`,
      listingId,
      verificationScore,
    })
    console.log(
      `[seed-my-listings] ${target.sellerName} -> listing=${listingId} (${vehicle.brand} ${vehicle.model}, score ${verificationScore})`,
    )
  }

  console.log('\n[seed-my-listings] Done:')
  console.table(results)
  process.exit(0)
}

main().catch((error) => {
  console.error('[seed-my-listings] Failed:', error)
  process.exit(1)
})
