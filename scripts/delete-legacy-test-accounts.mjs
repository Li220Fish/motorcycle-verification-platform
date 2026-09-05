/**
 * Retires the 3 legacy role-based test accounts (buyer/seller/dealer
 * @motoverify.test) that predate the 5-account roster in
 * docs/test-accounts.md — MotoVerify has no buyer/seller/dealer role, so
 * these no longer match how the app models identity (see that doc's "Why 5
 * accounts, not 3" section).
 *
 * Deletes, per account: the Firebase Auth user itself, its
 * users/{uid}/{following,blockedUsers,savedPosts,favoriteListings}
 * subcollection docs, and its users/{uid} Firestore profile doc.
 *
 * Deliberately does NOT touch content these accounts created elsewhere
 * (marketplaceListings, discussionPosts, conversations, verifications) —
 * that's substantive data, not "the account," and this app denormalizes
 * display identity at write time (authorSnapshot/memberSnapshots/
 * vehicleSnapshot) specifically so it doesn't break when the creator's
 * profile is gone. Run with no flags first to see exactly what still
 * references each uid before deciding whether further cleanup is wanted.
 *
 * The client SDK has no "admin deletes another user's Auth account" API —
 * only self-deletion (deleteUser(auth.currentUser), which requires a recent
 * sign-in). Since these 3 accounts' passwords are known/documented, this
 * script signs into each one and has it delete itself, then separately
 * signs in as admin to remove the leftover Firestore profile doc (uses the
 * users/{uid} admin-delete bypass added alongside this script).
 *
 * Dry-run by default — pass --confirm to actually delete.
 *
 * Usage:
 *   ALLOW_TEST_SEED=true node scripts/delete-legacy-test-accounts.mjs           # dry run
 *   ALLOW_TEST_SEED=true node scripts/delete-legacy-test-accounts.mjs --confirm # deletes
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { initializeApp } from 'firebase/app'
import { deleteUser, getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { collection, deleteDoc, doc, getDocs, getFirestore } from 'firebase/firestore'

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
    console.error('[delete-legacy-test-accounts] Refusing to run: NODE_ENV=production.')
    process.exit(1)
  }
  if (process.env.ALLOW_TEST_SEED !== 'true') {
    console.error(
      '[delete-legacy-test-accounts] Refusing to run: set ALLOW_TEST_SEED=true to confirm this is a dev/QA environment.',
    )
    process.exit(1)
  }
}

const LEGACY_ACCOUNTS = [
  { label: 'buyer', email: 'buyer@motoverify.test', password: 'MotoVerify123!' },
  { label: 'seller', email: 'seller@motoverify.test', password: 'MotoVerify123!' },
  { label: 'dealer', email: 'dealer@motoverify.test', password: 'MotoVerify123!' },
]
const SUBCOLLECTIONS = ['following', 'blockedUsers', 'savedPosts', 'favoriteListings']
const ADMIN_EMAIL = 'admin@test.com'
const ADMIN_PASSWORD = 'test1234'

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
      '[delete-legacy-test-accounts] Missing Firebase config — check .env / .env.local.',
    )
    process.exit(1)
  }

  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db = getFirestore(app)

  console.log(
    `[delete-legacy-test-accounts] Project: ${firebaseConfig.projectId} (${confirm ? 'LIVE DELETE' : 'dry run'})`,
  )

  const results = []
  for (const account of LEGACY_ACCOUNTS) {
    let credential
    try {
      credential = await signInWithEmailAndPassword(auth, account.email, account.password)
    } catch (error) {
      console.log(
        `[delete-legacy-test-accounts] ${account.label} (${account.email}): sign-in failed (${error.code}) — already deleted? Skipping.`,
      )
      results.push({ ...account, skipped: true })
      continue
    }
    const uid = credential.user.uid

    const subcollectionCounts = {}
    for (const sub of SUBCOLLECTIONS) {
      const snap = await getDocs(collection(db, 'users', uid, sub))
      subcollectionCounts[sub] = snap.size
    }
    console.log(
      `[delete-legacy-test-accounts] ${account.label} (${account.email}) uid=${uid}: ` +
        SUBCOLLECTIONS.map((s) => `${s}=${subcollectionCounts[s]}`).join(', '),
    )

    if (confirm) {
      for (const sub of SUBCOLLECTIONS) {
        const snap = await getDocs(collection(db, 'users', uid, sub))
        for (const d of snap.docs) {
          await deleteDoc(doc(db, 'users', uid, sub, d.id))
        }
      }
      await deleteUser(auth.currentUser)
      console.log(
        `[delete-legacy-test-accounts] ${account.label}: Auth user + subcollections deleted.`,
      )
    } else {
      await signOut(auth)
    }

    results.push({ ...account, uid, subcollectionCounts, skipped: false })
  }

  if (confirm) {
    await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD)
    for (const r of results) {
      if (r.skipped) continue
      await deleteDoc(doc(db, 'users', r.uid))
      console.log(
        `[delete-legacy-test-accounts] users/${r.uid} (${r.label}) Firestore profile deleted.`,
      )
    }
    await signOut(auth)
  }

  console.log(
    confirm
      ? '\n[delete-legacy-test-accounts] Done.'
      : '\n[delete-legacy-test-accounts] Dry run only — pass --confirm to delete.',
  )
  process.exit(0)
}

main().catch((error) => {
  console.error('[delete-legacy-test-accounts] Failed:', error)
  process.exit(1)
})
