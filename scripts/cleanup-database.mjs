/**
 * Dev/QA-only cleanup for the `vehicles` and `verifications` collections
 * (+ their `answers`/`evidence` subcollections) in the live Firestore
 * project. Months of Playwright regression runs (each creating a fresh
 * throwaway account + blank vehicle + verification) and the pre-engine/
 * chassis-number naming-step flow left this collection full of vehicles
 * that can never satisfy the new archiving rule (both 引擎號碼 and 車身號碼
 * required — see seller-verification.ts PREP-01). Rather than triage which
 * of those are salvageable, this wipes both collections outright; run
 * `npm run seed:mock-vehicles` afterwards to repopulate clean demo data.
 *
 * Does NOT touch Firebase Storage (uploaded evidence photos/videos from past
 * e2e runs are left in place — out of scope for this pass) or any other
 * collection (conversations, discussionPosts, users, ...).
 *
 * Uses the Firebase client SDK only, signed in as the seeded 測試賣家
 * account — the Firestore rules leave `vehicles`/`verifications` open to any
 * signed-in user (see the Freeze Zone comment in firestore.rules), so this
 * needs no Admin SDK / service account key.
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
  await signInWithEmailAndPassword(auth, 'seller@motoverify.test', 'MotoVerify123!')

  console.log(
    `[cleanup-database] Project: ${firebaseConfig.projectId} (${confirm ? 'LIVE DELETE' : 'dry run'})`,
  )

  const [vehicleSnapshot, verificationSnapshot] = await Promise.all([
    getDocs(collection(db, 'vehicles')),
    getDocs(collection(db, 'verifications')),
  ])

  let answerCount = 0
  let evidenceCount = 0
  const subcollectionRefs = []
  for (const verificationDoc of verificationSnapshot.docs) {
    const [answers, evidence] = await Promise.all([
      getDocs(collection(db, 'verifications', verificationDoc.id, 'answers')),
      getDocs(collection(db, 'verifications', verificationDoc.id, 'evidence')),
    ])
    answerCount += answers.size
    evidenceCount += evidence.size
    subcollectionRefs.push(...answers.docs.map((d) => d.ref), ...evidence.docs.map((d) => d.ref))
  }

  console.log(`[cleanup-database] vehicles:      ${vehicleSnapshot.size}`)
  console.log(
    `[cleanup-database] verifications: ${verificationSnapshot.size} (answers: ${answerCount}, evidence: ${evidenceCount})`,
  )

  if (!confirm) {
    console.log('[cleanup-database] Dry run only — pass --confirm to actually delete.')
    process.exit(0)
  }

  await deleteRefsInBatches(db, subcollectionRefs)
  await deleteRefsInBatches(
    db,
    verificationSnapshot.docs.map((d) => d.ref),
  )
  await deleteRefsInBatches(
    db,
    vehicleSnapshot.docs.map((d) => d.ref),
  )

  console.log('[cleanup-database] Done — vehicles & verifications (+ subcollections) removed.')
  process.exit(0)
}

main().catch((error) => {
  console.error('[cleanup-database] Failed:', error)
  process.exit(1)
})
