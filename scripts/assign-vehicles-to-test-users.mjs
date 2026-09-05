/**
 * Assigns every vehicles/{id} document's currentOwnerId to one of the 3
 * standard fixed test users (user1/user2/user3 — not admin, not agenttest),
 * round-robin, so each has something in their garage to test with.
 * Requested directly by the user alongside the 5-account seed
 * (docs/test-accounts.md), instead of seeding brand-new vehicles — this
 * round is explicitly about reusing what already exists, not creating more.
 *
 * Reassigning vehicles.currentOwnerId is sufficient on its own — fuelLogs/
 * maintenanceLogs reads and verifications get/list/update all gate on
 * ownsVehicle(vehicleId) (firestore.rules), which resolves against the
 * vehicle's CURRENT owner, so read/write access to a vehicle's whole
 * history (logs, verifications) follows the reassignment automatically.
 * fuelLogs/maintenanceLogs.recordedBy and verifications.userId are left
 * untouched — those record who actually created that specific entry, which
 * reassigning ownership doesn't retroactively rewrite (the same principle a
 * real ownership transfer uses elsewhere in this app).
 *
 * Looks up user1/user2/user3's real uids from accountIds/{accountId} rather
 * than hardcoding them, so this stays correct if the seed accounts are ever
 * recreated with new uids.
 *
 * Uses the Firebase client SDK only, signed in as the seeded admin account.
 * Dry-run by default — pass --confirm to actually write.
 *
 * Usage:
 *   ALLOW_TEST_SEED=true node scripts/assign-vehicles-to-test-users.mjs           # dry run
 *   ALLOW_TEST_SEED=true node scripts/assign-vehicles-to-test-users.mjs --confirm # writes
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { collection, doc, getDoc, getDocs, getFirestore, writeBatch } from 'firebase/firestore'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const ADMIN_EMAIL = 'admin@test.com'
const ADMIN_PASSWORD = 'test1234'
const TARGET_ACCOUNT_IDS = ['user1', 'user2', 'user3']

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
    console.error('[assign-vehicles-to-test-users] Refusing to run: NODE_ENV=production.')
    process.exit(1)
  }
  if (process.env.ALLOW_TEST_SEED !== 'true') {
    console.error(
      '[assign-vehicles-to-test-users] Refusing to run: set ALLOW_TEST_SEED=true to confirm this is a dev/QA environment.',
    )
    process.exit(1)
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
      '[assign-vehicles-to-test-users] Missing Firebase config — check .env / .env.local.',
    )
    process.exit(1)
  }

  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db = getFirestore(app)
  await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD)

  console.log(
    `[assign-vehicles-to-test-users] Project: ${firebaseConfig.projectId} (${confirm ? 'LIVE WRITE' : 'dry run'})`,
  )

  const targetUids = []
  for (const accountId of TARGET_ACCOUNT_IDS) {
    const snap = await getDoc(doc(db, 'accountIds', accountId))
    if (!snap.exists()) {
      throw new Error(`accountIds/${accountId} does not exist — run seed-test-users.mjs first.`)
    }
    targetUids.push({ accountId, uid: snap.data().authUid })
  }
  console.log(
    '[assign-vehicles-to-test-users] Target owners:',
    targetUids.map((t) => `${t.accountId}=${t.uid}`).join(', '),
  )

  const vehiclesSnap = await getDocs(collection(db, 'vehicles'))
  const vehicles = vehiclesSnap.docs
  console.log(`[assign-vehicles-to-test-users] Found ${vehicles.length} vehicle(s).`)

  if (vehicles.length === 0) {
    console.log('[assign-vehicles-to-test-users] Nothing to assign. Done.')
    process.exit(0)
  }

  const assignments = vehicles.map((vehicleDoc, index) => {
    const target = targetUids[index % targetUids.length]
    const data = vehicleDoc.data()
    return {
      id: vehicleDoc.id,
      label: `${data.brand ?? ''} ${data.model ?? ''}`.trim() || vehicleDoc.id,
      fromUid: data.currentOwnerId ?? '(none)',
      toAccountId: target.accountId,
      toUid: target.uid,
    }
  })

  for (const a of assignments) {
    console.log(
      `[assign-vehicles-to-test-users] ${a.id} (${a.label}): ${a.fromUid} -> ${a.toUid} (${a.toAccountId})`,
    )
  }

  if (!confirm) {
    console.log('\n[assign-vehicles-to-test-users] Dry run only — pass --confirm to write.')
    process.exit(0)
  }

  const batch = writeBatch(db)
  for (const a of assignments) {
    batch.update(doc(db, 'vehicles', a.id), { currentOwnerId: a.toUid })
  }
  await batch.commit()

  console.log(`\n[assign-vehicles-to-test-users] Reassigned ${assignments.length} vehicle(s).`)
  process.exit(0)
}

main().catch((error) => {
  console.error('[assign-vehicles-to-test-users] Failed:', error)
  process.exit(1)
})
