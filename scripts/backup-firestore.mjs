/**
 * Dev/QA-only local backup of every collection the v1.0 schema migration
 * touches (see docs/firestore-v1-implementation-report.md once it exists,
 * and the approved plan this script was written from). This is undo-
 * insurance for scripts/migrate-v1-schema.mjs's reshape writes — NOT
 * disaster recovery, and NOT a substitute for a real `gcloud firestore
 * export` (gcloud isn't installed in this environment, and this project
 * deliberately has no Admin SDK / service account key — see every other
 * script's header comment).
 *
 * Uses the Firebase client SDK only, signed in as the seeded admin account
 * (admin@test.com — see scripts/seed-test-users.mjs). Today's firestore.rules
 * already grant that account read access to every collection this script
 * dumps (either via the open "any signed-in user" rules that predate the
 * v1.0 migration, or via the existing isAdmin() bypasses on
 * conversations/discussionReports) — this must run BEFORE Phase 5's rules
 * tightening ships, while that's still true.
 *
 * Usage:
 *   ALLOW_TEST_SEED=true node scripts/backup-firestore.mjs
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { collection, getDocs, getFirestore } from 'firebase/firestore'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const backupDir = path.join(rootDir, 'backup', 'firestore-before-v1')

const ADMIN_EMAIL = 'admin@test.com'
const ADMIN_PASSWORD = 'test1234'

// [root collection, subcollections to also dump per doc]
const TARGETS = [
  ['vehicles', ['fuelLogs', 'maintenanceLogs']],
  ['verifications', ['answers', 'evidence']],
  ['marketplaceListings', ['appointments']],
  ['users', ['following', 'savedPosts', 'blockedUsers', 'favoriteListings']],
  ['conversations', ['messages']],
  ['discussionPosts', ['comments', 'likes']],
  ['discussionReports', []],
  ['vehicleNews', []],
  ['vehicleModels', []],
  // About to be deleted by scripts/delete-deprecated-collections.mjs — dumped
  // here first purely for the paper trail.
  ['voltageSessions', []],
  ['userPreferences', []],
  ['myListings', []],
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
    console.error('[backup-firestore] Refusing to run: NODE_ENV=production.')
    process.exit(1)
  }
  if (process.env.ALLOW_TEST_SEED !== 'true') {
    console.error(
      '[backup-firestore] Refusing to run: set ALLOW_TEST_SEED=true to confirm this is a dev/QA environment.',
    )
    process.exit(1)
  }
}

/** Firestore Timestamp -> ISO string so JSON.stringify doesn't choke on it
 * (and so the backup is human-readable). */
function serializeData(data) {
  const out = {}
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value.toDate === 'function') {
      out[key] = value.toDate().toISOString()
    } else if (Array.isArray(value)) {
      out[key] = value.map((item) =>
        item && typeof item.toDate === 'function' ? item.toDate().toISOString() : item,
      )
    } else {
      out[key] = value
    }
  }
  return out
}

function writeJson(fileName, docs) {
  mkdirSync(backupDir, { recursive: true })
  writeFileSync(path.join(backupDir, fileName), JSON.stringify(docs, null, 2), 'utf-8')
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
    console.error('[backup-firestore] Missing Firebase config — check .env / .env.local.')
    process.exit(1)
  }

  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db = getFirestore(app)
  await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD)

  console.log(`[backup-firestore] Project: ${firebaseConfig.projectId} -> ${backupDir}`)

  let totalDocs = 0
  for (const [rootName, subcollections] of TARGETS) {
    let rootSnapshot
    try {
      rootSnapshot = await getDocs(collection(db, rootName))
    } catch (error) {
      console.warn(`[backup-firestore] SKIPPED ${rootName}: ${error.code ?? error.message}`)
      continue
    }
    writeJson(
      `${rootName}.json`,
      rootSnapshot.docs.map((d) => ({ id: d.id, ...serializeData(d.data()) })),
    )
    totalDocs += rootSnapshot.size
    console.log(`[backup-firestore] ${rootName}: ${rootSnapshot.size} docs`)

    for (const sub of subcollections) {
      const subDocs = []
      let skipped = 0
      for (const parentDoc of rootSnapshot.docs) {
        try {
          const subSnapshot = await getDocs(collection(db, rootName, parentDoc.id, sub))
          for (const d of subSnapshot.docs) {
            subDocs.push({ id: d.id, parentId: parentDoc.id, ...serializeData(d.data()) })
          }
        } catch {
          skipped += 1
        }
      }
      writeJson(`${rootName}__${sub}.json`, subDocs)
      totalDocs += subDocs.length
      console.log(
        `[backup-firestore]   ${rootName}/*/${sub}: ${subDocs.length} docs` +
          (skipped > 0 ? ` (${skipped} parent(s) skipped — no read permission)` : ''),
      )
    }
  }

  console.log(`[backup-firestore] Done — ${totalDocs} total docs backed up to ${backupDir}`)
  process.exit(0)
}

main().catch((error) => {
  console.error('[backup-firestore] Failed:', error)
  process.exit(1)
})
