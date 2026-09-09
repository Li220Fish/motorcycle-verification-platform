/**
 * One-time (re-runnable) import of a curated 台灣機車重機型號表 CSV into the
 * `vehicleModels` reference collection — backs VehicleModelSelect.vue's
 * 廠牌/車系/排氣量/名稱 cascading picker and BasicHealthCheck13.vue's
 * conditional 鏈條 item (see Vehicle.hasChain in src/types/vehicle.ts).
 *
 * CSV columns (UTF-8, no quoted fields): 廠牌,車系,名稱,排氣量,油耗,馬力,
 * 形式,鏈條傳動,圖片路徑,同義詞 — mapped to brand/series/trimName/
 * displacementCc/-/-/bodyType/hasChain/-/-. 油耗、馬力、圖片路徑、同義詞 are
 * intentionally NOT imported: fuel/power are rough estimates not worth
 * treating as spec data, and cover images are a separate in-progress effort
 * (scripts/fetch-model-image-candidates.mjs / apply-model-image.mjs).
 *
 * 排氣量 sometimes lists more than one CC value for one row (e.g.
 * "124.5/155.8 CC" for a model sold in two displacements) — each distinct
 * value becomes its own vehicleModels doc sharing the same brand/series/
 * trimName/bodyType/hasChain, so 排氣量 bucketing in the picker works
 * correctly for each variant.
 *
 * Idempotent: every doc this script writes is tagged importSource=
 * CSV_IMPORT_SOURCE; on each run, existing docs with that same tag are
 * deleted before re-inserting, so re-running replaces this script's own
 * output in place instead of accumulating duplicates. Docs from any other
 * source (admin-added via ModelsSection.vue, or another import) are
 * untouched since they won't carry this tag.
 *
 * Usage:
 *   ALLOW_TEST_SEED=true node scripts/import-vehicle-models-csv.mjs [csvPath]
 * Defaults to ~/Downloads/台灣機車重機型號表_1990至今.csv if no path given.
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import os from 'node:os'
import path from 'node:path'

import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import {
  addDoc,
  collection,
  deleteDoc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const CSV_IMPORT_SOURCE = 'csv-1990-present'
const DEFAULT_CSV_PATH = path.join(os.homedir(), 'Downloads', '台灣機車重機型號表_1990至今.csv')

const EMPTY_SPECS = {
  engine: {
    coolingType: null,
    cylinderCount: null,
    valveTrain: null,
    valvesPerCylinder: null,
    compressionRatio: null,
    maxPowerHp: null,
    maxPowerRpm: null,
    maxTorqueKgm: null,
    maxTorqueRpm: null,
    fuelSystem: null,
    startSystem: null,
    fuelTankCapacityL: null,
  },
  electric: { motorPowerW: null, motorPowerRpm: null, batteryCount: null },
  dimensions: {
    lengthMm: null,
    widthMm: null,
    heightMm: null,
    seatHeightMm: null,
    wheelbaseMm: null,
    weightKg: null,
  },
  safety: { abs: false, tcs: false, cbs: false },
  efficiency: { officialAverageKmPerL: null, fuelType: null, emissionStandard: null },
}

const EMPTY_FEATURES = {
  convenience: { keyless: false, usbCharging: false, idleStop: false, reverseAssist: false },
  display: { displayType: null, smartphoneConnect: false, navigationSupport: false },
  lighting: {
    ledHeadlight: false,
    ledTaillight: false,
    ledTurnSignals: false,
    hazardLights: false,
  },
  storage: { underSeatStorageL: null, frontStorage: false },
  security: { immobilizer: false, antiTheftAlarm: false },
}

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
    console.error('[import-vehicle-models-csv] Refusing to run: NODE_ENV=production.')
    process.exit(1)
  }
  if (process.env.ALLOW_TEST_SEED !== 'true') {
    console.error(
      '[import-vehicle-models-csv] Refusing to run: set ALLOW_TEST_SEED=true to confirm this is a dev/QA environment.',
    )
    process.exit(1)
  }
}

/** "124.5/155.8 CC" -> [124.5, 155.8]; "97 CC" -> [97]. */
function parseDisplacements(raw) {
  return raw
    .replace(/CC/i, '')
    .split('/')
    .map((part) => Number.parseFloat(part.trim()))
    .filter((value) => Number.isFinite(value))
}

function parseCsv(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((line) => line.trim() !== '')
  const [, ...rows] = lines // drop header row — column order is documented above, not re-derived
  return rows.map((line) => {
    const [brand, series, trimName, displacement, , , bodyType, hasChainRaw] = line.split(',')
    return {
      brand: brand?.trim() ?? '',
      series: series?.trim() ?? '',
      trimName: trimName?.trim() ?? '',
      displacements: parseDisplacements(displacement ?? ''),
      bodyType: bodyType?.trim() || null,
      hasChain: hasChainRaw?.trim().toLowerCase() === 'true',
    }
  })
}

async function main() {
  guardEnvironment()

  const csvPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_CSV_PATH
  if (!existsSync(csvPath)) {
    console.error(`[import-vehicle-models-csv] CSV not found: ${csvPath}`)
    process.exit(1)
  }

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
    console.error('[import-vehicle-models-csv] Missing Firebase config — check .env / .env.local.')
    process.exit(1)
  }

  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db = getFirestore(app)
  await signInWithEmailAndPassword(auth, 'admin@test.com', 'test1234')

  console.log(`[import-vehicle-models-csv] Project: ${firebaseConfig.projectId}`)
  console.log(`[import-vehicle-models-csv] CSV: ${csvPath}`)

  const rows = parseCsv(readFileSync(csvPath, 'utf-8'))
  console.log(`[import-vehicle-models-csv] Parsed ${rows.length} CSV rows.`)

  const modelsCollection = collection(db, 'vehicleModels')

  const staleSnapshot = await getDocs(
    query(modelsCollection, where('importSource', '==', CSV_IMPORT_SOURCE)),
  )
  if (staleSnapshot.size > 0) {
    console.log(`[import-vehicle-models-csv] Removing ${staleSnapshot.size} docs from a prior run...`)
    await Promise.all(staleSnapshot.docs.map((docSnapshot) => deleteDoc(docSnapshot.ref)))
  }

  let written = 0
  for (const row of rows) {
    if (!row.brand || !row.trimName) continue
    const displacements = row.displacements.length > 0 ? row.displacements : [null]
    for (const displacementCc of displacements) {
      await addDoc(modelsCollection, {
        brand: row.brand,
        series: row.series,
        modelYear: null,
        trimName: row.trimName,
        bodyType: row.bodyType,
        powerType: 'gasoline',
        displacementCc,
        transmission: null,
        hasChain: row.hasChain,
        coverImageUrl: null,
        photos: [],
        specs: EMPTY_SPECS,
        features: EMPTY_FEATURES,
        realFuelStats: { averageKmPerL: null, vehicleCount: 0 },
        reviewStats: { averageRating: null, reviewCount: 0 },
        importSource: CSV_IMPORT_SOURCE,
        createdAt: serverTimestamp(),
      })
      written += 1
    }
  }

  console.log(`[import-vehicle-models-csv] Wrote ${written} vehicleModels docs.`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[import-vehicle-models-csv] Failed:', error)
    process.exit(1)
  })
