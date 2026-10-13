/**
 * One-time backfill for the "近半年驗車紀錄" marketplace feature
 * (MarketplaceListingView.vue) — listings published BEFORE this feature
 * existed only ever got `verificationIds: [theOneVerification]`. This finds
 * every other completed 賣家驗證 for the same vehicle within 6 months of
 * that listing's publishedAt and appends them, so already-live listings get
 * a history section too instead of only showing it for listings published
 * from now on.
 *
 * Purely additive and idempotent: never touches `verificationIds[0]` (the
 * already-pinned primary report a buyer may already have a /share/:id link
 * to) — only appends further ids after it — and skips any listing whose
 * `verificationIds` already has more than one entry (already backfilled, or
 * created by the new multi-id publish() flow).
 *
 * Always targets STAGING (motorcycle-verification) — loads .env.staging
 * explicitly, NOT .env (see scripts/seed-test-users.mjs's own header
 * comment on why that default-to-.env gotcha matters here too).
 *
 * Usage:
 *   ALLOW_TEST_SEED=true node scripts/backfill-marketplace-verification-history.mjs            # dry run
 *   ALLOW_TEST_SEED=true node scripts/backfill-marketplace-verification-history.mjs --confirm   # apply
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  Timestamp,
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
    console.error('[backfill-marketplace-verification-history] Refusing to run: NODE_ENV=production.')
    process.exit(1)
  }
  if (process.env.ALLOW_TEST_SEED !== 'true') {
    console.error(
      '[backfill-marketplace-verification-history] Refusing to run: set ALLOW_TEST_SEED=true to confirm this is a dev/QA environment.',
    )
    process.exit(1)
  }
}

const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 182
const BATCH_SIZE = 400

function toMillis(value) {
  if (value instanceof Timestamp) return value.toMillis()
  if (typeof value === 'number') return value
  return 0
}

async function main() {
  guardEnvironment()
  const confirm = process.argv.includes('--confirm')

  const envStaging = loadEnvFile(path.join(rootDir, '.env.staging'))
  const env = { ...envStaging, ...process.env }
  const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  }
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error(
      '[backfill-marketplace-verification-history] Missing Firebase config — check .env.staging.',
    )
    process.exit(1)
  }
  if (firebaseConfig.projectId !== 'motorcycle-verification') {
    console.error(
      `[backfill-marketplace-verification-history] Refusing to run against project "${firebaseConfig.projectId}" — this script only ever targets staging (motorcycle-verification).`,
    )
    process.exit(1)
  }

  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db = getFirestore(app)
  await signInWithEmailAndPassword(auth, 'admin@test.com', 'test1234')

  console.log(
    `[backfill-marketplace-verification-history] Project: ${firebaseConfig.projectId} (${confirm ? 'LIVE WRITE' : 'dry run'})`,
  )

  const listingsSnapshot = await getDocs(collection(db, 'marketplaceListings'))
  const writes = []
  const isPublicFlips = []
  let scanned = 0
  let skippedNoVehicle = 0
  let skippedAlreadyHasHistory = 0
  let skippedNoPrimary = 0

  for (const listingDoc of listingsSnapshot.docs) {
    const listing = listingDoc.data()
    if (listing.status !== 'published' || !listing.vehicleId) {
      skippedNoVehicle++
      continue
    }
    scanned++
    const existingIds = listing.verificationIds ?? []
    if (existingIds.length > 1) {
      skippedAlreadyHasHistory++
      continue
    }
    const primaryId = existingIds[0]
    if (!primaryId) {
      skippedNoPrimary++
      continue
    }

    const windowEnd = toMillis(listing.publishedAt) || toMillis(listing.createdAt) || Date.now()
    const windowStart = windowEnd - SIX_MONTHS_MS

    const verificationsSnapshot = await getDocs(
      query(collection(db, 'verifications'), where('vehicleId', '==', listing.vehicleId)),
    )
    const recentIds = verificationsSnapshot.docs
      .map((d) => ({ id: d.id, data: d.data() }))
      .filter(({ data }) => data.type === 'seller' && data.status === 'completed')
      .filter(({ data }) => {
        const createdAt = toMillis(data.createdAt)
        return createdAt >= windowStart && createdAt <= windowEnd
      })
      .sort((a, b) => toMillis(b.data.createdAt) - toMillis(a.data.createdAt))
      .map(({ id }) => id)

    const newIds = [primaryId, ...recentIds.filter((id) => id !== primaryId)]
    if (newIds.length === existingIds.length) continue // nothing new in-window

    writes.push({ ref: listingDoc.ref, verificationIds: newIds })
    for (const id of newIds) {
      if (!isPublicFlips.includes(id)) isPublicFlips.push(id)
    }
    console.log(
      `[backfill-marketplace-verification-history] ${listingDoc.id}: ${existingIds.length} -> ${newIds.length} verification(s)`,
    )
  }

  console.log(
    `[backfill-marketplace-verification-history] scanned ${scanned} published listings, ` +
      `${skippedNoVehicle} skipped (no vehicleId/not published), ` +
      `${skippedAlreadyHasHistory} skipped (already has history), ` +
      `${skippedNoPrimary} skipped (no primary verification), ` +
      `${writes.length} need backfill`,
  )

  if (!confirm) {
    console.log(
      '[backfill-marketplace-verification-history] Dry run only — pass --confirm to actually write.',
    )
    process.exit(0)
  }

  // isPublic flips first (same one-way false->true flip listingService.publish()
  // does) — skip any already public, same "all-or-nothing batch" caution that
  // function's own comment documents, so one already-public id can't sink an
  // unrelated listing's batch.
  for (let i = 0; i < isPublicFlips.length; i += BATCH_SIZE) {
    const batch = writeBatch(db)
    let queued = 0
    for (const id of isPublicFlips.slice(i, i + BATCH_SIZE)) {
      const ref = doc(db, 'verifications', id)
      const snap = await getDoc(ref)
      if (snap.data()?.isPublic === true) continue
      batch.update(ref, { isPublic: true })
      queued++
    }
    if (queued > 0) await batch.commit()
  }

  for (let i = 0; i < writes.length; i += BATCH_SIZE) {
    const batch = writeBatch(db)
    for (const w of writes.slice(i, i + BATCH_SIZE)) {
      batch.update(w.ref, { verificationIds: w.verificationIds })
    }
    await batch.commit()
  }

  console.log(`[backfill-marketplace-verification-history] Backfilled ${writes.length} listing(s).`)
  process.exit(0)
}

main().catch((error) => {
  console.error('[backfill-marketplace-verification-history] Failed:', error)
  process.exit(1)
})
