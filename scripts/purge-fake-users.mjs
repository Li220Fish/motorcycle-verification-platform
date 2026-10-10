/**
 * Dev/QA-only purge of `users/{uid}` profile docs NOT belonging to one of
 * the 5 fixed test accounts (docs/test-accounts.md / seed-test-users.mjs) or
 * the extra real accounts manually confirmed during
 * scripts/purge-fake-verification-data.mjs (2026-09-15) — same allowlist,
 * kept in sync by hand since both scripts solve the same "what counts as
 * real" question for different collections.
 *
 * /admin/users (src/admin/sections/UsersSection.vue) reads this collection
 * directly (Firebase Auth has no client-listable "all users" API — see that
 * component's own on-page note), so deleting the fake profile docs here is
 * exactly what makes them stop appearing in that admin list.
 *
 * Also attempts to retire the underlying Firebase Auth account for accounts
 * whose password is known (the `regress-*@example.com` Playwright
 * regression-suite accounts, fixed password `TestPass123!` — see
 * tests/e2e/verification-regression.spec.ts's registerAndLogin()), via the
 * same self-sign-in-then-self-delete pattern as
 * scripts/delete-legacy-test-accounts.mjs (the client SDK has no "admin
 * deletes another user's Auth account" API). Any other fake account (e.g.
 * ad-hoc `zz-*@example.com` scratch accounts from manual debugging, whose
 * passwords were never recorded) only gets its Firestore profile doc
 * removed — the Auth account itself is left orphaned since there's no way
 * to delete it without its credentials. Reported explicitly, not silently
 * skipped.
 *
 * Dry-run by default — pass --confirm to actually delete.
 *
 * Usage:
 *   ALLOW_TEST_SEED=true node scripts/purge-fake-users.mjs           # dry run
 *   ALLOW_TEST_SEED=true node scripts/purge-fake-users.mjs --confirm # deletes
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { initializeApp } from 'firebase/app'
import {
  deleteUser,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { collection, deleteDoc, doc, getDoc, getDocs, getFirestore } from 'firebase/firestore'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const KNOWN_ACCOUNT_IDS = ['motoverify_admin', 'user1', 'user2', 'user3', 'agenttest']

// Same 3 uids manually confirmed as real during purge-fake-verification-data.mjs.
const EXTRA_REAL_UIDS = [
  'I7sf73xe8JUC8Ardln7NiGQV0IF3', // jefferylu9333@gmail.com
  'C4Rn3b9vpoXn2mRoL8WJUnFOg9k1',
  'yDENwJ99G5bugPSt9LZMkIV6PvD3',
]

const REGRESSION_SUITE_PASSWORD = 'TestPass123!'

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
    console.error('[purge-fake-users] Refusing to run: NODE_ENV=production.')
    process.exit(1)
  }
  if (process.env.ALLOW_TEST_SEED !== 'true') {
    console.error(
      '[purge-fake-users] Refusing to run: set ALLOW_TEST_SEED=true to confirm this is a dev/QA environment.',
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
    console.error('[purge-fake-users] Missing Firebase config — check .env / .env.local.')
    process.exit(1)
  }

  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db = getFirestore(app)
  await signInWithEmailAndPassword(auth, 'admin@test.com', 'test1234')

  console.log(
    `[purge-fake-users] Project: ${firebaseConfig.projectId} (${confirm ? 'LIVE DELETE' : 'dry run'})`,
  )

  const knownUids = new Set()
  for (const accountId of KNOWN_ACCOUNT_IDS) {
    const snap = await getDoc(doc(db, 'accountIds', accountId))
    if (snap.exists()) knownUids.add(snap.data().authUid)
  }
  for (const uid of EXTRA_REAL_UIDS) knownUids.add(uid)
  console.log(`[purge-fake-users] Known/real uids excluded from purge: ${knownUids.size}`)

  const usersSnapshot = await getDocs(collection(db, 'users'))
  const fakeUserDocs = usersSnapshot.docs.filter((d) => !knownUids.has(d.id))

  console.log(
    `[purge-fake-users] users scanned: ${usersSnapshot.size}, fake: ${fakeUserDocs.length}`,
  )

  const regressionAccounts = []
  const orphanAccounts = []
  for (const d of fakeUserDocs) {
    const email = d.data().email ?? ''
    if (/^regress-[a-z-]+-\d+@example\.com$/.test(email)) {
      regressionAccounts.push({ uid: d.id, email })
    } else {
      orphanAccounts.push({ uid: d.id, email })
    }
  }

  console.log(
    `\n--- Fake users (${regressionAccounts.length} regression-suite, Auth account also retirable; ${orphanAccounts.length} other, Firestore doc only) ---`,
  )
  for (const u of regressionAccounts) console.log(`  [regress] users/${u.uid}  ${u.email}`)
  for (const u of orphanAccounts) console.log(`  [other]   users/${u.uid}  ${u.email}`)

  if (fakeUserDocs.length === 0) {
    console.log('\n[purge-fake-users] Nothing to clean up.')
    process.exit(0)
  }

  if (!confirm) {
    console.log('\n[purge-fake-users] Dry run only — pass --confirm to actually delete.')
    process.exit(0)
  }

  // Retire the regression-suite Auth accounts first (self-sign-in required —
  // must happen before we sign back in as admin to delete the profile docs).
  let authDeletedCount = 0
  for (const u of regressionAccounts) {
    try {
      await signInWithEmailAndPassword(auth, u.email, REGRESSION_SUITE_PASSWORD)
      await deleteUser(auth.currentUser)
      authDeletedCount++
    } catch (error) {
      console.warn(`[purge-fake-users] Could not retire Auth account ${u.email}: ${error.code ?? error.message}`)
      await signOut(auth).catch(() => {})
    }
  }
  await signInWithEmailAndPassword(auth, 'admin@test.com', 'test1234')

  for (const u of fakeUserDocs) {
    await deleteDoc(doc(db, 'users', u.id))
  }

  console.log(
    `\n[purge-fake-users] Done — ${fakeUserDocs.length} fake users/ profile docs removed ` +
      `(${authDeletedCount}/${regressionAccounts.length} regression-suite Auth accounts also retired). ` +
      `${orphanAccounts.length} other accounts' underlying Auth entries are left orphaned — password unknown, cannot self-delete via client SDK.`,
  )
  process.exit(0)
}

main().catch((error) => {
  console.error('[purge-fake-users] Failed:', error)
  process.exit(1)
})
