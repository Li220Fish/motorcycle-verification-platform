/**
 * Dev/QA-only seed script for MotoVerify's 5 fixed test accounts (1 admin +
 * 4 standard users), matching the Firebase Auth / Firestore identity split
 * frozen in MotoVerify_Firestore_v1_Agent_Implementation.md §5: every
 * account gets users/{authUid} + accountIds/{accountId} + publicProfiles/{accountId}.
 *
 * This is currently the ONLY place in the app that builds this three-way
 * identity chain — the general sign-up flow (touchUserProfile(), called
 * from auth.store.ts) still writes plain users/{authUid} docs with no
 * accountId, exactly as before this script existed. Wiring accountId
 * claiming into general sign-up needs a real "choose your handle"
 * onboarding screen (claimAccountId(), spec §28) — a distinct, sizeable
 * feature, deliberately deferred rather than folded into this pass. See
 * docs/test-accounts.md and the "Test Accounts" section of
 * docs/firestore-v1-implementation-report.md.
 *
 * Uses the Firebase *client* SDK only (no Admin SDK, no service account key
 * — same as every other script in this directory). Idempotent: re-running
 * signs into existing accounts instead of failing, refreshes their
 * users/publicProfiles documents, and refuses to silently reassign an
 * accountId that's already claimed by a different uid.
 *
 * Usage:
 *   ALLOW_TEST_SEED=true node scripts/seed-test-users.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { initializeApp } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { doc, getDoc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore'

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
    console.error('[seed-test-users] Refusing to run: NODE_ENV=production.')
    process.exit(1)
  }
  if (process.env.ALLOW_TEST_SEED !== 'true') {
    console.error(
      '[seed-test-users] Refusing to run: set ALLOW_TEST_SEED=true to confirm this is a dev/QA environment.\n' +
        '  Example: ALLOW_TEST_SEED=true node scripts/seed-test-users.mjs',
    )
    process.exit(1)
  }
}

// Fixed, frozen roster — do not add ad-hoc accounts here; agenttest is the
// one all automation (Playwright/E2E/smoke/rules tests) should prefer, so
// throwaway test data doesn't get scattered across the other 4 identities.
//
// Password is "test1234", not the literal "test" — Firebase Auth rejects
// any password under 6 characters (auth/weak-password) with no per-project
// override, client-SDK or otherwise. "test1234" is the smallest change that
// still reads as obviously "test" (confirmed with the user after the first
// live run failed on this).
const TEST_PASSWORD = 'test1234'

const ACCOUNTS = [
  {
    header: 'ADMIN',
    email: 'admin@test.com',
    password: TEST_PASSWORD,
    accountId: 'motoverify_admin',
    displayName: '管理員',
    role: 'ADMIN',
  },
  {
    header: 'USER 1',
    email: 'user1@test.com',
    password: TEST_PASSWORD,
    accountId: 'user1',
    displayName: '用戶1',
    role: 'STANDARD',
  },
  {
    header: 'USER 2',
    email: 'user2@test.com',
    password: TEST_PASSWORD,
    accountId: 'user2',
    displayName: '用戶2',
    role: 'STANDARD',
  },
  {
    header: 'USER 3',
    email: 'user3@test.com',
    password: TEST_PASSWORD,
    accountId: 'user3',
    displayName: '用戶3',
    role: 'STANDARD',
  },
  {
    header: 'AGENT TEST',
    email: 'agent@test.com',
    password: TEST_PASSWORD,
    accountId: 'agenttest',
    displayName: 'Agent測試帳號',
    role: 'STANDARD',
  },
]

async function seedAccount(auth, db, account) {
  let uid
  let isNew = false
  try {
    const credential = await createUserWithEmailAndPassword(auth, account.email, account.password)
    uid = credential.user.uid
    isNew = true
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      const credential = await signInWithEmailAndPassword(auth, account.email, account.password)
      uid = credential.user.uid
    } else {
      throw error
    }
  }

  if (isNew) {
    await updateProfile(auth.currentUser, { displayName: account.displayName })
  }

  // accountIds/{accountId} — permanently unique (spec §5.3). Never
  // reassign silently: if it already points at a *different* uid, stop
  // hard rather than guess which side is stale.
  const accountIdRef = doc(db, 'accountIds', account.accountId)
  const existingAccountId = await getDoc(accountIdRef)
  if (existingAccountId.exists()) {
    const boundUid = existingAccountId.data().authUid
    if (boundUid !== uid) {
      throw new Error(
        `accountIds/${account.accountId} already points to uid=${boundUid}, but ` +
          `${account.email} resolved to uid=${uid}. Refusing to overwrite — resolve manually.`,
      )
    }
  } else {
    await setDoc(accountIdRef, { authUid: uid, createdAt: serverTimestamp() })
  }

  // users/{authUid} — exact schema from spec §5.1. Not a merge: this is the
  // canonical rebuild of a fixed seed account's profile, so it also heals a
  // doc that picked up stray fields (uid/updatedAt) from touchUserProfile()
  // if someone signed into this email through the regular app in between.
  const userRef = doc(db, 'users', uid)
  const existingUser = await getDoc(userRef)
  const existingCreatedAt = existingUser.data()?.createdAt
  await setDoc(userRef, {
    accountId: account.accountId,
    email: account.email,
    displayName: account.displayName,
    photoUrl: null,
    accountTier: 'standard',
    region: null,
    lastSeenAt: serverTimestamp(),
    createdAt: existingCreatedAt ?? serverTimestamp(),
  })

  // publicProfiles/{accountId} — exact schema from spec §5.2. No email/uid/
  // region — this is the only doc other users are meant to read.
  const publicProfileRef = doc(db, 'publicProfiles', account.accountId)
  await setDoc(publicProfileRef, {
    accountId: account.accountId,
    displayName: account.displayName,
    photoUrl: null,
    accountTier: 'standard',
  })

  await signOut(auth)

  return { ...account, uid, isNew }
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
    console.error('[seed-test-users] Missing Firebase config — check .env / .env.local.')
    process.exit(1)
  }

  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db = getFirestore(app)

  console.log(`[seed-test-users] Seeding into Firebase project: ${firebaseConfig.projectId}`)

  const results = []
  for (const account of ACCOUNTS) {
    const result = await seedAccount(auth, db, account)
    results.push(result)
    console.log(
      `[seed-test-users] ${result.isNew ? 'created' : 'reused'} ${result.email} -> uid=${result.uid} accountId=${result.accountId}`,
    )
  }

  console.log('\n================================')
  console.log('MotoVerify Test Users')
  console.log('================================\n')
  for (const r of results) {
    console.log(r.header)
    console.log(`Email: ${r.email}`)
    console.log(`Password: ${r.password}`)
    console.log(`Account ID: ${r.accountId}`)
    console.log(`Firebase UID: ${r.uid}`)
    console.log(`Role: ${r.role}`)
    console.log('')
  }
  console.log('================================')

  process.exit(0)
}

main().catch((error) => {
  console.error('[seed-test-users] Failed:', error)
  process.exit(1)
})
