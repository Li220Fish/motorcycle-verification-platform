/**
 * Dev/QA-only purge of vehicle/verification data NOT owned by one of the 5
 * fixed test accounts (docs/test-accounts.md / scripts/seed-test-users.mjs:
 * admin@test.com, user1@test.com, user2@test.com, user3@test.com,
 * agent@test.com). Everything else — leftover Playwright/e2e throwaway
 * accounts, manual scratch accounts, anything created outside this roster —
 * is treated as fake data per explicit instruction.
 *
 * "Fake" is computed as the union of:
 *   - any vehicles/{id} whose currentOwnerId is not one of the 5 known uids
 *   - any verifications/{id} whose userId is not one of the 5 known uids,
 *     OR whose vehicleId points at one of the fake vehicles above
 *
 * Deletes, for each fake verification: its answers/ and evidence/
 * subcollections, then the verification doc itself. Deletes, for each fake
 * vehicle: its fuelLogs/ and maintenanceLogs/ subcollections, then the
 * vehicle doc itself. Does NOT touch Firebase Storage files or any other
 * collection (marketplaceListings, discussionPosts, conversations, users) —
 * out of scope for this pass, matching scripts/cleanup-database.mjs's own
 * scoping precedent.
 *
 * Uses the Firebase client SDK only (no Admin SDK / service account key —
 * same as every other script in this directory), signed in as the seeded
 * admin account.
 *
 * Dry-run by default — pass --confirm to actually delete.
 *
 * Usage:
 *   ALLOW_TEST_SEED=true node scripts/purge-fake-verification-data.mjs           # dry run
 *   ALLOW_TEST_SEED=true node scripts/purge-fake-verification-data.mjs --confirm # deletes
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { collection, doc, getDoc, getDocs, getFirestore, writeBatch } from 'firebase/firestore'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const KNOWN_ACCOUNT_IDS = ['motoverify_admin', 'user1', 'user2', 'user3', 'agenttest']

// Manually confirmed with the user (2026-09-15) as real, non-test accounts
// found mixed into the data during this purge — NOT part of the fixed
// 5-account roster, but excluded here because they own live isPublic:true
// verification reports that would otherwise be destroyed irreversibly.
const EXTRA_REAL_UIDS = [
  'I7sf73xe8JUC8Ardln7NiGQV0IF3', // jefferylu9333@gmail.com
  'C4Rn3b9vpoXn2mRoL8WJUnFOg9k1', // no users/ doc, but owns 3 isPublic:true verifications
  'yDENwJ99G5bugPSt9LZMkIV6PvD3', // no users/ doc, 1 in-progress verification
]

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
    console.error('[purge-fake-verification-data] Refusing to run: NODE_ENV=production.')
    process.exit(1)
  }
  if (process.env.ALLOW_TEST_SEED !== 'true') {
    console.error(
      '[purge-fake-verification-data] Refusing to run: set ALLOW_TEST_SEED=true to confirm this is a dev/QA environment.',
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
    console.error('[purge-fake-verification-data] Missing Firebase config — check .env / .env.local.')
    process.exit(1)
  }

  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db = getFirestore(app)
  await signInWithEmailAndPassword(auth, 'admin@test.com', 'test1234')

  console.log(
    `[purge-fake-verification-data] Project: ${firebaseConfig.projectId} (${confirm ? 'LIVE DELETE' : 'dry run'})`,
  )

  // Resolve the 5 known uids via accountIds/{accountId}.authUid.
  const knownUids = new Map() // uid -> accountId
  for (const accountId of KNOWN_ACCOUNT_IDS) {
    const snap = await getDoc(doc(db, 'accountIds', accountId))
    if (!snap.exists()) {
      console.warn(`[purge-fake-verification-data] accountIds/${accountId} not found — skipping.`)
      continue
    }
    knownUids.set(snap.data().authUid, accountId)
  }
  console.log(
    '[purge-fake-verification-data] Known accounts:',
    [...knownUids.entries()].map(([uid, id]) => `${id}=${uid}`).join(', '),
  )
  if (knownUids.size === 0) {
    console.error('[purge-fake-verification-data] No known accounts resolved — aborting.')
    process.exit(1)
  }
  for (const uid of EXTRA_REAL_UIDS) knownUids.set(uid, '(manually confirmed real, non-test account)')
  console.log(
    '[purge-fake-verification-data] Extra real accounts excluded from purge:',
    EXTRA_REAL_UIDS.join(', '),
  )

  // Cache uid -> email lookups (users/{uid}) for readable reporting only.
  const emailCache = new Map()
  async function describeUid(uid) {
    if (!uid) return '(no userId/ownerId field)'
    if (emailCache.has(uid)) return emailCache.get(uid)
    const snap = await getDoc(doc(db, 'users', uid))
    const label = snap.exists() ? (snap.data().email ?? '(no email field)') : '(no users/ doc)'
    emailCache.set(uid, label)
    return label
  }

  const vehicleSnapshot = await getDocs(collection(db, 'vehicles'))
  const fakeVehicleDocs = vehicleSnapshot.docs.filter((d) => !knownUids.has(d.data().currentOwnerId))
  const fakeVehicleIds = new Set(fakeVehicleDocs.map((d) => d.id))

  const verificationSnapshot = await getDocs(collection(db, 'verifications'))
  const fakeVerificationDocs = verificationSnapshot.docs.filter((d) => {
    const data = d.data()
    return !knownUids.has(data.userId) || fakeVehicleIds.has(data.vehicleId)
  })

  console.log(
    `\n[purge-fake-verification-data] vehicles scanned: ${vehicleSnapshot.size}, fake (unknown owner): ${fakeVehicleDocs.length}`,
  )
  console.log(
    `[purge-fake-verification-data] verifications scanned: ${verificationSnapshot.size}, fake: ${fakeVerificationDocs.length}`,
  )

  if (fakeVehicleDocs.length > 0) {
    console.log('\n--- Fake vehicles (unknown owner) ---')
    for (const d of fakeVehicleDocs) {
      const data = d.data()
      const ownerLabel = await describeUid(data.currentOwnerId)
      console.log(
        `  vehicles/${d.id}  owner=${data.currentOwnerId} (${ownerLabel})  ${data.brand ?? ''} ${data.model ?? ''}`.trim(),
      )
    }
  }

  if (fakeVerificationDocs.length > 0) {
    console.log('\n--- Fake verifications ---')
    for (const d of fakeVerificationDocs) {
      const data = d.data()
      const ownerLabel = await describeUid(data.userId)
      console.log(
        `  verifications/${d.id}  userId=${data.userId} (${ownerLabel})  vehicleId=${data.vehicleId}  type=${data.type}  status=${data.status}  isPublic=${data.isPublic}`,
      )
    }
  }

  let answerCount = 0
  let evidenceCount = 0
  const verificationSubcollectionRefs = []
  for (const verificationDoc of fakeVerificationDocs) {
    const [answers, evidence] = await Promise.all([
      getDocs(collection(db, 'verifications', verificationDoc.id, 'answers')),
      getDocs(collection(db, 'verifications', verificationDoc.id, 'evidence')),
    ])
    answerCount += answers.size
    evidenceCount += evidence.size
    verificationSubcollectionRefs.push(...answers.docs.map((d) => d.ref), ...evidence.docs.map((d) => d.ref))
  }

  let fuelLogCount = 0
  let maintenanceLogCount = 0
  const vehicleSubcollectionRefs = []
  for (const vehicleDoc of fakeVehicleDocs) {
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
    `\n[purge-fake-verification-data] subcollections — verification answers: ${answerCount}, evidence: ${evidenceCount}, vehicle fuelLogs: ${fuelLogCount}, maintenanceLogs: ${maintenanceLogCount}`,
  )

  if (fakeVehicleDocs.length === 0 && fakeVerificationDocs.length === 0) {
    console.log('\n[purge-fake-verification-data] Nothing to clean up.')
    process.exit(0)
  }

  if (!confirm) {
    console.log('\n[purge-fake-verification-data] Dry run only — pass --confirm to actually delete.')
    process.exit(0)
  }

  await deleteRefsInBatches(db, verificationSubcollectionRefs)
  await deleteRefsInBatches(db, vehicleSubcollectionRefs)
  await deleteRefsInBatches(
    db,
    fakeVerificationDocs.map((d) => d.ref),
  )
  await deleteRefsInBatches(
    db,
    fakeVehicleDocs.map((d) => d.ref),
  )

  console.log('\n[purge-fake-verification-data] Done — fake vehicles & verifications (+ subcollections) removed.')
  process.exit(0)
}

main().catch((error) => {
  console.error('[purge-fake-verification-data] Failed:', error)
  process.exit(1)
})
