/**
 * Dev/QA-only seed script for 5 fully-fledged demo vehicles, owned by the
 * 測試賣家 test account (see docs/test-accounts.md). Each vehicle has a
 * real photo (hotlinked from Wikimedia Commons — "先用網址抓圖" per the
 * request, rather than piping bytes through Firebase Storage for a mock),
 * a full identity (brand/model/year/mileage/plate/引擎號碼/車身號碼), and a
 * completed Seller Verification with EVERY required item answered — not
 * just PREP-01 — so the 檢驗報告 screen (VerificationReportView.vue) shows
 * real 良好/需要注意 badges across all 5 categories instead of "未檢查"
 * everywhere. No evidence (photos/videos/voltage) is written — that report
 * screen never renders evidence, and the completion gate
 * (verification.store.ts missingRequiredItems) only checks answers, not
 * evidence, so this mirrors what "completed" actually means in this app.
 *
 * The required-item ID list below is mirrored from
 * src/data/verification/seller-verification.ts + photo-slots.ts (73 items:
 * 70 required + 3 optional — PREP-07, ELEC-10, APR-modifications — which
 * are deliberately left unanswered, same as a real seller who skipped an
 * optional step would leave them). Plain .mjs can't import that '@/'-aliased
 * TS module directly, so if that flow definition changes, update this list
 * to match.
 *
 * Uses the Firebase client SDK only, signed in as the seeded admin account —
 * these vehicles/verifications are owned/verified by 3 different test
 * accounts from one session, which only admin's create-rule bypass allows
 * (see firestore.rules' vehicles/verifications create rules).
 *
 * Idempotent: before creating each of the 5 vehicles below, deletes any
 * existing vehicle already owned by that same account with the same
 * brand+model (plus its verification + answers/evidence), so re-running
 * this script replaces the demo data in place instead of duplicating it.
 * This matters because scripts/cleanup-database.mjs no longer wipes the
 * whole `vehicles` collection before a reseed (that used to also delete
 * real users' own vehicles as collateral damage) — this script now owns
 * cleaning up its own prior output.
 *
 * Usage:
 *   ALLOW_TEST_SEED=true node scripts/seed-mock-vehicles.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
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
    console.error('[seed-mock-vehicles] Refusing to run: NODE_ENV=production.')
    process.exit(1)
  }
  if (process.env.ALLOW_TEST_SEED !== 'true') {
    console.error(
      '[seed-mock-vehicles] Refusing to run: set ALLOW_TEST_SEED=true to confirm this is a dev/QA environment.',
    )
    process.exit(1)
  }
}

// The 3 seeded test accounts (docs/test-accounts.md) — most vehicles stay
// owned by 測試賣家 (who also performs every seeded verification below,
// regardless of current owner — that's "who verified it", not "who owns it
// now"), but one each goes to 測試買家 and MotoVerify 車商 so every test
// account has at least one real vehicle to look at, without inventing new
// mock data (per the request — reusing these same 5 vehicles).
const SELLER_UID = 'C4Rn3b9vpoXn2mRoL8WJUnFOg9k1'
const BUYER_UID = 'e399kAhI9PNTmC2RqRT3K6tdiRq1'
const DEALER_UID = 'WfRtacVURlSxRIrrtBsVX7E651c2'

// All photos: real motorcycle photos on Wikimedia Commons, freely licensed
// and stable to hotlink (upload.wikimedia.org serves API-generated thumb
// widths without the anti-hotlink restriction raw /thumb/ paths hit).
const VEHICLES = [
  {
    brand: 'HONDA',
    model: 'PCX 160',
    year: 2022,
    mileage: 8200,
    licensePlate: 'MHA-6602',
    engineNumber: 'KF12E-2200451',
    chassisNumber: 'MH34-0220451',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/2021_Honda_PCX_160_Standard.jpg/960px-2021_Honda_PCX_160_Standard.jpg',
    attentionNotes: {},
  },
  {
    brand: 'SYM',
    model: 'JET 14 125',
    year: 2021,
    mileage: 15400,
    licensePlate: 'LJH-3321',
    engineNumber: 'PN23E-1841002',
    chassisNumber: 'SL14-1841002',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Sym_jet_4_rear_front.jpg/960px-Sym_jet_4_rear_front.jpg',
    attentionNotes: {
      'CHK-09': '前輪胎胎紋深度接近更換標準，建議近期更換。',
    },
  },
  {
    brand: 'GOGORO',
    model: '1 Plus',
    year: 2020,
    mileage: 21300,
    licensePlate: 'EAK-0119',
    engineNumber: 'EM-2020-77341',
    chassisNumber: 'GG1P-2077341',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Gogoro_1_Plus_Blue.jpg/960px-Gogoro_1_Plus_Blue.jpg',
    attentionNotes: {
      'CHK-02': '車側有輕微刮痕，不影響安全與功能。',
      'CHK-09': '前輪胎損耗約七成，建議留意。',
    },
  },
  {
    brand: 'KAWASAKI',
    model: 'Z900',
    year: 2019,
    mileage: 9800,
    licensePlate: 'RKZ-0900',
    engineNumber: 'ZR900-19E33210',
    chassisNumber: 'JKAZXNE1-19A00456',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/KawasakiZ900.jpg/960px-KawasakiZ900.jpg',
    attentionNotes: {
      'CHK-12': '前避震器下段有少量油漬，建議近期複檢。',
    },
    ownerUid: DEALER_UID,
  },
  {
    brand: 'KYMCO',
    model: 'Agility 125',
    year: 2020,
    mileage: 18700,
    licensePlate: 'KYA-5588',
    engineNumber: 'SR12E-2033187',
    chassisNumber: 'RFBM4-2033187',
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Kymco_Agility_50_2T_R16%2B.jpg/960px-Kymco_Agility_50_2T_R16%2B.jpg',
    attentionNotes: {
      'CHK-02': '車尾有輕微刮痕。',
      'CHK-10': '後輪胎損耗約六成，尚在可用範圍。',
      'ELEC-11': '走線略有雜亂，建議整理束帶。',
    },
    ownerUid: BUYER_UID,
  },
]

// --- Mirrors seller-verification.ts's required-item IDs (see file header). ---
const CHK_IDS = Array.from({ length: 19 }, (_, i) => `CHK-${String(i + 1).padStart(2, '0')}`)
const REQUIRED_PHOTO_SLOT_IDS = [
  'left-side',
  'right-side',
  'front',
  'rear',
  'plate',
  'front-wheel',
  'rear-wheel',
  'front-fork',
  'rear-fork',
  'front-brake',
  'rear-brake',
  'engine-left',
  'engine-right',
  'engine-bottom',
  'cvt',
  'exhaust',
  'triple-clamp',
  'under-seat',
  'vin',
]
const APR_IDS = REQUIRED_PHOTO_SLOT_IDS.map((slot) => `APR-${slot}`)
const ELEC_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13].map(
  (n) => `ELEC-${String(n).padStart(2, '0')}`,
)
const ENG_IDS = Array.from({ length: 14 }, (_, i) => `ENG-${String(i + 1).padStart(2, '0')}`)
const PREP_SIMPLE_IDS = ['PREP-03', 'PREP-04', 'PREP-05']

const SIMPLE_NORMAL_IDS = [...PREP_SIMPLE_IDS, ...CHK_IDS, ...APR_IDS, ...ELEC_IDS, ...ENG_IDS]

/**
 * Deletes any previously-seeded vehicle owned by `ownerUid` matching this
 * exact brand+model (+ its verification and answers/evidence), so re-running
 * this script replaces rather than duplicates. Filters client-side on
 * brand/model after a single equality query on currentOwnerId, same
 * composite-index-avoidance pattern as vehicleService.list().
 */
async function deleteExistingSeededVehicle(db, ownerUid, brand, model) {
  const ownerVehicles = await getDocs(
    query(collection(db, 'vehicles'), where('currentOwnerId', '==', ownerUid)),
  )
  const matches = ownerVehicles.docs.filter(
    (d) => d.data().brand === brand && d.data().model === model,
  )
  for (const vehicleDoc of matches) {
    const verifications = await getDocs(
      query(collection(db, 'verifications'), where('vehicleId', '==', vehicleDoc.id)),
    )
    for (const verificationDoc of verifications.docs) {
      const [answers, evidence] = await Promise.all([
        getDocs(collection(db, 'verifications', verificationDoc.id, 'answers')),
        getDocs(collection(db, 'verifications', verificationDoc.id, 'evidence')),
      ])
      const batch = writeBatch(db)
      for (const answerDoc of answers.docs) batch.delete(answerDoc.ref)
      for (const evidenceDoc of evidence.docs) batch.delete(evidenceDoc.ref)
      batch.delete(verificationDoc.ref)
      await batch.commit()
    }
    await deleteDoc(vehicleDoc.ref)
  }
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
    console.error('[seed-mock-vehicles] Missing Firebase config — check .env / .env.local.')
    process.exit(1)
  }

  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db = getFirestore(app)
  await signInWithEmailAndPassword(auth, 'admin@test.com', 'test1234')
  const sellerUid = SELLER_UID

  console.log(`[seed-mock-vehicles] Seeding into Firebase project: ${firebaseConfig.projectId}`)
  console.log(`[seed-mock-vehicles] Verifier: seller@motoverify.test (${sellerUid})`)

  const results = []
  for (const vehicle of VEHICLES) {
    const ownerUid = vehicle.ownerUid ?? sellerUid
    await deleteExistingSeededVehicle(db, ownerUid, vehicle.brand, vehicle.model)
    const vehicleRef = await addDoc(collection(db, 'vehicles'), {
      brand: vehicle.brand,
      model: vehicle.model,
      manufactureYear: vehicle.year,
      mileage: vehicle.mileage,
      licensePlate: vehicle.licensePlate,
      engineNumber: vehicle.engineNumber,
      chassisNumber: vehicle.chassisNumber,
      photos: [vehicle.imageUrl],
      currentOwnerId: ownerUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    const verificationRef = await addDoc(collection(db, 'verifications'), {
      vehicleId: vehicleRef.id,
      userId: sellerUid,
      type: 'seller',
      status: 'completed',
      mileage: vehicle.mileage,
      createdAt: serverTimestamp(),
    })
    await updateDoc(doc(db, 'verifications', verificationRef.id), {
      status: 'completed',
      completedAt: serverTimestamp(),
    })

    const answersCollection = collection(db, 'verifications', verificationRef.id, 'answers')
    const batch = writeBatch(db)

    // PREP-01 mirrors the vehicle exactly — this is what makes the record
    // satisfy the new archiving rule (both 引擎號碼 and 車身號碼 filled in).
    batch.set(doc(answersCollection, 'PREP-01'), {
      itemId: 'PREP-01',
      result: 'normal',
      formData: {
        brand: vehicle.brand,
        model: vehicle.model,
        year: String(vehicle.year),
        mileage: String(vehicle.mileage),
        plate: vehicle.licensePlate,
        engineNumber: vehicle.engineNumber,
        chassisNumber: vehicle.chassisNumber,
      },
      updatedAt: serverTimestamp(),
    })
    batch.set(doc(answersCollection, 'PREP-02'), {
      itemId: 'PREP-02',
      result: 'normal',
      formData: { sellerName: '測試賣家', registrationName: '測試賣家' },
      updatedAt: serverTimestamp(),
    })
    batch.set(doc(answersCollection, 'PREP-06'), {
      itemId: 'PREP-06',
      result: 'normal',
      formData: { keyCount: '2' },
      updatedAt: serverTimestamp(),
    })

    for (const itemId of SIMPLE_NORMAL_IDS) {
      const note = vehicle.attentionNotes[itemId]
      const answer = {
        itemId,
        result: note ? 'attention' : 'normal',
        updatedAt: serverTimestamp(),
      }
      if (note) answer.note = note
      batch.set(doc(answersCollection, itemId), answer)
    }

    await batch.commit()

    results.push({
      vehicle: `${vehicle.brand} ${vehicle.model}`,
      vehicleId: vehicleRef.id,
      verificationId: verificationRef.id,
      owner:
        vehicle.ownerUid === BUYER_UID
          ? '測試買家'
          : vehicle.ownerUid === DEALER_UID
            ? '車商'
            : '測試賣家',
      attentionItems: Object.keys(vehicle.attentionNotes).length,
    })
    console.log(
      `[seed-mock-vehicles] ${vehicle.brand} ${vehicle.model} -> vehicle=${vehicleRef.id} verification=${verificationRef.id} owner=${ownerUid} (${
        SIMPLE_NORMAL_IDS.length + 3
      } items answered)`,
    )
  }

  console.log('\n[seed-mock-vehicles] Done. Vehicles:')
  console.table(results)
  process.exit(0)
}

main().catch((error) => {
  console.error('[seed-mock-vehicles] Failed:', error)
  process.exit(1)
})
