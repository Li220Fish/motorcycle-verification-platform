/**
 * Dev/QA-only cleanup for THROWAWAY vehicles/verifications created by the
 * Playwright regression suite (tests/e2e/verification-regression.spec.ts's
 * registerAndLogin() + naming-step flow creates a vehicle with `model` set
 * to whatever name was typed in the naming step, e.g. "Regression Seller" —
 * see TEST_VEHICLE_NAME_PREFIXES below).
 *
 * IMPORTANT: this used to wipe the ENTIRE `vehicles`/`verifications`
 * collections unconditionally, regardless of owner. That also deleted any
 * real vehicle a real user (or a test account) had added through the live
 * app if this script happened to run while they were using it — a genuine
 * incident, not hypothetical. This is now scoped to ONLY vehicles whose
 * `model` matches a known throwaway-test naming prefix (and only those
 * vehicles' own verifications + answers/evidence subcollections) — the 5
 * seeded demo vehicles (real brand/model like "HONDA"/"PCX 160") and
 * anything a real user or test account adds themselves are never touched.
 *
 * If a future regression spec creates named vehicles some other way, add
 * its prefix to TEST_VEHICLE_NAME_PREFIXES rather than reverting to a full
 * wipe.
 *
 * Does NOT touch Firebase Storage (uploaded evidence photos/videos from past
 * e2e runs are left in place — out of scope for this pass) or any other
 * collection (conversations, discussionPosts, users, ...).
 *
 * Uses the Firebase client SDK only, signed in as the seeded admin account —
 * this script scans `vehicles` across every owner looking for throwaway test
 * data, which the v1.0 schema's owner-scoped rules only allow for admin (no
 * Admin SDK / service account key needed either way).
 *
 * Same production guard as scripts/seed-test-users.mjs. Dry-run by default —
 * pass --confirm to actually delete.
 *
 * Usage:
 *   ALLOW_TEST_SEED=true node scripts/cleanup-database.mjs           # dry run
 *   ALLOW_TEST_SEED=true node scripts/cleanup-database.mjs --confirm # deletes
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { collection, getDocs, getFirestore, writeBatch } from 'firebase/firestore'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const TEST_VEHICLE_NAME_PREFIXES = ['Regression', 'Archive Gate Test', 'Throwaway']

// Checks both `model` (the naming-only verification flow's field, e.g.
// "Regression Seller") AND `brand` (ad-hoc scratch vehicles created via the
// 我的車輛/新增車輛 form, which put the marker in brand instead — e.g.
// brand: "Throwaway", model: "FuelAvg E2E"). A vehicle matching on either
// field left a real orphan in the live project once already because this
// only checked `model` — see git history for the incident.
function isThrowawayVehicle(data) {
  const model = typeof data.model === 'string' ? data.model : ''
  const brand = typeof data.brand === 'string' ? data.brand : ''
  return TEST_VEHICLE_NAME_PREFIXES.some(
    (prefix) => model.startsWith(prefix) || brand.startsWith(prefix),
  )
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
    console.error('[cleanup-database] Refusing to run: NODE_ENV=production.')
    process.exit(1)
  }
  if (process.env.ALLOW_TEST_SEED !== 'true') {
    console.error(
      '[cleanup-database] Refusing to run: set ALLOW_TEST_SEED=true to confirm this is a dev/QA environment.',
    )
    process.exit(1)
  }
}

const BATCH_SIZE = 400

async function deleteRefsInBatches(db, refs) {
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db)
    for (const ref of refs.slice(i, i + BATCH_SIZE)) batch.delete(ref)
    await batch.commit()
  }
}

async function main() {
  guardEnvironment()
  const confirm = process.argv.includes('--confirm')

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
    console.error('[cleanup-database] Missing Firebase config — check .env / .env.local.')
    process.exit(1)
  }

  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db = getFirestore(app)
  await signInWithEmailAndPassword(auth, 'admin@test.com', 'test1234')

  console.log(
    `[cleanup-database] Project: ${firebaseConfig.projectId} (${confirm ? 'LIVE DELETE' : 'dry run'})`,
  )

  const vehicleSnapshot = await getDocs(collection(db, 'vehicles'))
  const throwawayVehicleDocs = vehicleSnapshot.docs.filter((d) => isThrowawayVehicle(d.data()))
  const throwawayVehicleIds = new Set(throwawayVehicleDocs.map((d) => d.id))

  const verificationSnapshot = await getDocs(collection(db, 'verifications'))
  const throwawayVerificationDocs = verificationSnapshot.docs.filter((d) =>
    throwawayVehicleIds.has(d.data().vehicleId),
  )

  let answerCount = 0
  let evidenceCount = 0
  const subcollectionRefs = []
  for (const verificationDoc of throwawayVerificationDocs) {
    const [answers, evidence] = await Promise.all([
      getDocs(collection(db, 'verifications', verificationDoc.id, 'answers')),
      getDocs(collection(db, 'verifications', verificationDoc.id, 'evidence')),
    ])
    answerCount += answers.size
    evidenceCount += evidence.size
    subcollectionRefs.push(...answers.docs.map((d) => d.ref), ...evidence.docs.map((d) => d.ref))
  }

  // Deleting a vehicle doc does not delete its own subcollections (fuel-up /
  // maintenance logs, added alongside Vehicle Detail's editable identity
  // fields) — orphaned but still-billed Firestore docs otherwise.
  let fuelLogCount = 0
  let maintenanceLogCount = 0
  const vehicleSubcollectionRefs = []
  for (const vehicleDoc of throwawayVehicleDocs) {
    const [fuelLogs, maintenanceLogs] = await Promise.all([
      getDocs(collection(db, 'vehicles', vehicleDoc.id, 'fuelLogs')),
      getDocs(collection(db, 'vehicles', vehicleDoc.id, 'maintenanceLogs')),
    ])
    fuelLogCount += fuelLogs.size
    maintenanceLogCount += maintenanceLogs.size
    vehicleSubcollectionRefs.push(
      ...fuelLogs.docs.map((d) => d.ref),
      ...maintenanceLogs.docs.map((d) => d.ref),
    )
  }

  console.log(
    `[cleanup-database] vehicles scanned: ${vehicleSnapshot.size}, throwaway (matched test-name prefix): ${throwawayVehicleDocs.length} (fuel logs: ${fuelLogCount}, maintenance logs: ${maintenanceLogCount})`,
  )
  console.log(
    `[cleanup-database] verifications scanned: ${verificationSnapshot.size}, throwaway: ${throwawayVerificationDocs.length} (answers: ${answerCount}, evidence: ${evidenceCount})`,
  )

  if (throwawayVehicleDocs.length === 0 && throwawayVerificationDocs.length === 0) {
    console.log('[cleanup-database] Nothing to clean up.')
    process.exit(0)
  }

  if (!confirm) {
    console.log('[cleanup-database] Dry run only — pass --confirm to actually delete.')
    process.exit(0)
  }

  await deleteRefsInBatches(db, subcollectionRefs)
  await deleteRefsInBatches(db, vehicleSubcollectionRefs)
  await deleteRefsInBatches(
    db,
    throwawayVerificationDocs.map((d) => d.ref),
  )
  await deleteRefsInBatches(
    db,
    throwawayVehicleDocs.map((d) => d.ref),
  )

  console.log(
    '[cleanup-database] Done — throwaway vehicles & verifications (+ subcollections) removed.',
  )
  process.exit(0)
}

main().catch((error) => {
  console.error('[cleanup-database] Failed:', error)
  process.exit(1)
})
