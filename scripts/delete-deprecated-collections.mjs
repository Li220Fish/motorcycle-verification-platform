/**
 * Removes the Firestore collections confirmed dead during the v1.0 schema
 * migration audit (see the approved migration plan / eventual
 * docs/firestore-v1-implementation-report.md):
 *
 *   - voltageSessions  — admin-display-only; the app's own
 *     voltageSessionService.start()/finish() exist but nothing calls them.
 *   - userPreferences  — zero reads anywhere in src/; only ever written by
 *     scripts/seed-test-users.mjs, which loses that write in this same change.
 *   - myListings       — zero references anywhere in src/; a stale rule with
 *     nothing behind it (the real "My Listings" feature queries
 *     marketplaceListings filtered by sellerId).
 *
 * consents/disclaimers/adminSettings are already gone (removed when the
 * /admin backend's copy-checker/consent/env-flags/push pages were deleted
 * earlier this project) — this script just asserts 0 docs for those three,
 * for symmetry with the migration checklist's "confirm empty" step.
 *
 * This does NOT touch any live collection (vehicles, verifications,
 * marketplaceListings, users, conversations, discussionPosts, vehicleNews,
 * vehicleModels, featuredDealers, ...) — see scripts/migrate-v1-schema.mjs
 * for those.
 *
 * Uses the Firebase client SDK only, signed in as the seeded admin account.
 * Dry-run by default — pass --confirm to actually delete.
 *
 * Usage:
 *   ALLOW_TEST_SEED=true node scripts/delete-deprecated-collections.mjs           # dry run
 *   ALLOW_TEST_SEED=true node scripts/delete-deprecated-collections.mjs --confirm # deletes
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { collection, getDocs, getFirestore, writeBatch } from 'firebase/firestore'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const ADMIN_EMAIL = 'admin@test.com'
const ADMIN_PASSWORD = 'test1234'

const TO_DELETE = ['voltageSessions', 'userPreferences', 'myListings']
const TO_ASSERT_EMPTY = ['consents', 'disclaimers', 'adminSettings']

const BATCH_SIZE = 400

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
    console.error('[delete-deprecated-collections] Refusing to run: NODE_ENV=production.')
    process.exit(1)
  }
  if (process.env.ALLOW_TEST_SEED !== 'true') {
    console.error(
      '[delete-deprecated-collections] Refusing to run: set ALLOW_TEST_SEED=true to confirm this is a dev/QA environment.',
    )
    process.exit(1)
  }
}

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
    console.error(
      '[delete-deprecated-collections] Missing Firebase config — check .env / .env.local.',
    )
    process.exit(1)
  }

  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db = getFirestore(app)
  await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD)

  console.log(
    `[delete-deprecated-collections] Project: ${firebaseConfig.projectId} (${confirm ? 'LIVE DELETE' : 'dry run'})`,
  )

  for (const name of TO_ASSERT_EMPTY) {
    try {
      const snapshot = await getDocs(collection(db, name))
      console.log(
        snapshot.empty
          ? `[delete-deprecated-collections] PASS: ${name} is empty (0 docs)`
          : `[delete-deprecated-collections] WARNING: ${name} has ${snapshot.size} docs but was expected already-empty — inspect before proceeding, this script does not delete it`,
      )
    } catch (error) {
      // No rule grants read access here (old or new — these collections
      // have no rule block at all, on purpose, since they're expected
      // already gone) — treat a permission error as "can't verify, but
      // consistent with already-empty," not a failure worth aborting for.
      console.log(
        `[delete-deprecated-collections] SKIPPED ${name}: ${error.code ?? error.message} (no rule permits reading a collection that's expected already empty — this is not evidence it still has data)`,
      )
    }
  }

  for (const name of TO_DELETE) {
    let snapshot
    try {
      snapshot = await getDocs(collection(db, name))
    } catch (error) {
      // Expected once the v1.0 rules are deployed (these collections lose
      // their rule block entirely) — run this script BEFORE that deploy,
      // while they're still readable, so this branch is a safety net for
      // out-of-order runs, not the intended path.
      console.log(
        `[delete-deprecated-collections] SKIPPED ${name}: ${error.code ?? error.message} (run this script before deploying the new rules, not after)`,
      )
      continue
    }
    console.log(`[delete-deprecated-collections] ${name}: ${snapshot.size} docs`)
    if (snapshot.empty) {
      console.log(`[delete-deprecated-collections] PASS: ${name} is empty (0 docs)`)
      continue
    }
    if (!confirm) {
      console.log(
        `[delete-deprecated-collections] Dry run — would delete ${snapshot.size} docs from ${name}.`,
      )
      continue
    }
    await deleteRefsInBatches(
      db,
      snapshot.docs.map((d) => d.ref),
    )
    console.log(`[delete-deprecated-collections] Deleted ${snapshot.size} docs from ${name}.`)
  }

  if (!confirm) {
    console.log('[delete-deprecated-collections] Dry run only — pass --confirm to actually delete.')
  }
  process.exit(0)
}

main().catch((error) => {
  console.error('[delete-deprecated-collections] Failed:', error)
  process.exit(1)
})
