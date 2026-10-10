/**
 * One-time, purely additive backfill for 基本12項健檢 (see
 * src/data/verification/basic-health-check-items.ts): 6 items that used to
 * be separate Optional "其他主動揭露" photo slots (APR-rear-suspension/
 * front-brake/rear-brake/triple-clamp/seat/modifications) were removed from
 * seller-verification.ts once 基本12項健檢 started covering the exact same
 * ground with its own tap markers (see photo-slots.ts's top comment). Any
 * verification that already has a real answer under one of those old ids
 * gets a matching NEW answer written under the corresponding BASIC-* id, so
 * its report/admin view shows something under the new tab instead of the
 * checklist item just vanishing.
 *
 * This does NOT delete or modify the old APR-* answer docs — "migrate in
 * place, never destroy" is the locked decision for this project (see
 * scripts/migrate-v1-schema.mjs's own header comment; one real data-loss
 * incident already happened from an unscoped wipe script). The old docs stay
 * exactly as they are, permanently — harmless orphans once the new BASIC-*
 * doc exists, surfaced under VerifyDetailSection.vue's catch-all "找不到對應
 * 檢測項目" section either way.
 *
 * Firestore rule reality this script has to respect (see firestore.rules'
 * answers/{itemId} `allow create`): admin can only CREATE a new answer doc
 * while the parent verification still has isPublic == false. A verification
 * whose report has already been published is immutable by design — this
 * script skips those and reports how many, rather than trying to route
 * around it (no Admin SDK / service account exists in this project — see
 * scripts/backup-firestore.mjs's own header comment for why not).
 *
 * Uses the Firebase client SDK only, signed in as the seeded admin account,
 * same convention as every other scripts/*.mjs migration/seed script.
 *
 * Usage:
 *   ALLOW_TEST_SEED=true node scripts/migrate-basic-health-check-answers.mjs             # dry run
 *   ALLOW_TEST_SEED=true node scripts/migrate-basic-health-check-answers.mjs --confirm   # apply
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { collection, doc, getDocs, getFirestore, writeBatch } from 'firebase/firestore'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const ADMIN_EMAIL = 'admin@test.com'
const ADMIN_PASSWORD = 'test1234'
const BATCH_SIZE = 400

// Old itemId -> 基本12項健檢 key (see basic-health-check-items.ts). The new
// answer's itemId is `BASIC-${key}`.
const OLD_TO_NEW_KEY = {
  'APR-rear-suspension': 'rearshock',
  'APR-front-brake': 'frontbrake',
  'APR-rear-brake': 'rearbrake',
  'APR-triple-clamp': 'triple',
  'APR-seat': 'seat',
  'APR-modifications': 'othermod',
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
    console.error('[migrate-basic-health-check-answers] Refusing to run: NODE_ENV=production.')
    process.exit(1)
  }
  if (process.env.ALLOW_TEST_SEED !== 'true') {
    console.error(
      '[migrate-basic-health-check-answers] Refusing to run: set ALLOW_TEST_SEED=true to confirm this is a dev/QA environment.',
    )
    process.exit(1)
  }
}

/** Firestore rejects `undefined` field values. */
function stripUndefined(value) {
  const result = {}
  for (const [key, val] of Object.entries(value)) {
    if (val !== undefined) result[key] = val
  }
  return result
}

async function commitCreatesInBatches(db, creates) {
  for (let i = 0; i < creates.length; i += BATCH_SIZE) {
    const batch = writeBatch(db)
    for (const c of creates.slice(i, i + BATCH_SIZE)) batch.set(c.ref, stripUndefined(c.data))
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
      '[migrate-basic-health-check-answers] Missing Firebase config — check .env / .env.local.',
    )
    process.exit(1)
  }

  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db = getFirestore(app)
  await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD)

  console.log(
    `[migrate-basic-health-check-answers] Project: ${firebaseConfig.projectId} (${confirm ? 'LIVE WRITE' : 'dry run'})`,
  )

  const verificationsSnapshot = await getDocs(collection(db, 'verifications'))
  console.log(
    `[migrate-basic-health-check-answers] scanned ${verificationsSnapshot.size} verifications`,
  )

  const creates = []
  let skippedPublic = 0
  let alreadyMigrated = 0
  let sourceAnswersFound = 0

  for (const verificationDoc of verificationsSnapshot.docs) {
    const verificationData = verificationDoc.data()
    const answersSnapshot = await getDocs(
      collection(db, 'verifications', verificationDoc.id, 'answers'),
    )
    const byItemId = new Map(answersSnapshot.docs.map((d) => [d.id, d.data()]))

    for (const [oldItemId, key] of Object.entries(OLD_TO_NEW_KEY)) {
      const oldAnswer = byItemId.get(oldItemId)
      if (!oldAnswer) continue
      sourceAnswersFound += 1

      const newItemId = `BASIC-${key}`
      if (byItemId.has(newItemId)) {
        alreadyMigrated += 1
        continue
      }
      if (verificationData.isPublic === true) {
        skippedPublic += 1
        console.warn(
          `[migrate-basic-health-check-answers]   verifications/${verificationDoc.id}: isPublic=true, cannot create ${newItemId} (skipped — old ${oldItemId} answer left in place)`,
        )
        continue
      }

      creates.push({
        ref: doc(db, 'verifications', verificationDoc.id, 'answers', newItemId),
        data: {
          itemId: newItemId,
          result: oldAnswer.result ?? 'unsure',
          note: oldAnswer.note ?? null,
          updatedAt: oldAnswer.updatedAt ?? Date.now(),
        },
      })
    }
  }

  console.log(
    `[migrate-basic-health-check-answers] source answers found: ${sourceAnswersFound}, already migrated: ${alreadyMigrated}, skipped (published/immutable): ${skippedPublic}, to write: ${creates.length}`,
  )

  if (confirm && creates.length > 0) {
    await commitCreatesInBatches(db, creates)
    console.log(`[migrate-basic-health-check-answers]   -> created ${creates.length} docs`)
  }

  if (!confirm) {
    console.log(
      '[migrate-basic-health-check-answers] Dry run only — pass --confirm to actually write.',
    )
  }
  process.exit(0)
}

main().catch((error) => {
  console.error('[migrate-basic-health-check-answers] Failed:', error)
  process.exit(1)
})
