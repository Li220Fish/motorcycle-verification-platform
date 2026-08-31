/**
 * Dev/QA-only seed script for the 3 named MotoVerify test accounts.
 *
 * Uses the same Firebase *client* SDK the app itself uses (no Admin SDK, no
 * service account key) — createUserWithEmailAndPassword is a normal client
 * operation, so there is no privileged credential to protect or accidentally
 * commit here.
 *
 * Refuses to run unless BOTH:
 *   - NODE_ENV is not "production"
 *   - ALLOW_TEST_SEED=true is explicitly set
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

const ACCOUNTS = [
  {
    email: 'buyer@motoverify.test',
    password: 'MotoVerify123!',
    displayName: '測試買家',
    defaultRole: 'buyer',
    accountType: 'individual',
  },
  {
    email: 'seller@motoverify.test',
    password: 'MotoVerify123!',
    displayName: '測試賣家',
    defaultRole: 'seller',
    accountType: 'individual',
  },
  {
    email: 'dealer@motoverify.test',
    password: 'MotoVerify123!',
    displayName: 'MotoVerify 車商',
    defaultRole: 'professional_seller',
    accountType: 'dealer',
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

  const userRef = doc(db, 'users', uid)
  const existing = await getDoc(userRef)
  await setDoc(
    userRef,
    {
      uid,
      email: account.email,
      displayName: account.displayName,
      photoURL: null,
      defaultRole: account.defaultRole,
      currentRole: account.defaultRole,
      accountType: account.accountType,
      region: 'TW',
      createdAt: existing.exists() ? existing.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
    },
    { merge: true },
  )

  await setDoc(
    doc(db, 'userPreferences', uid),
    { currentRole: account.defaultRole, updatedAt: Date.now() },
    { merge: true },
  )

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
      `[seed-test-users] ${result.isNew ? 'created' : 'reused'} ${result.email} -> uid=${result.uid} role=${result.defaultRole}`,
    )
  }

  console.log('\n[seed-test-users] Done. Accounts:')
  console.table(
    results.map((r) => ({
      email: r.email,
      uid: r.uid,
      role: r.defaultRole,
      status: r.isNew ? 'created' : 'reused',
    })),
  )

  process.exit(0)
}

main().catch((error) => {
  console.error('[seed-test-users] Failed:', error)
  process.exit(1)
})
