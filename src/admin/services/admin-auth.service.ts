import { signInWithEmailAndPassword } from 'firebase/auth'

import { auth } from '@/services/firebase/firebase'

/**
 * The /admin/login form accepts the literal "test/test" — that is not a real
 * Firebase credential, it's exchanged here for the real seeded admin account
 * (scripts/seed-test-users.mjs, one of the 5 fixed accounts documented in
 * docs/test-accounts.md) so Firestore's security rules (which gate
 * admin-only reads on request.auth.uid, see firestore.rules' isAdmin()) see
 * a genuine authenticated session. A fake client-only "is admin" flag with
 * no real Firebase Auth session behind it would leave Firestore either wide
 * open (if rules trusted it) or completely unreadable (if they didn't).
 *
 * The real credential (admin@test.com / test1234) happens to now also work
 * as a normal login on the main app's /login screen — that's fine, being
 * "admin" is entirely determined by firestore.rules' isAdmin() uid check,
 * not by which screen was used to sign in.
 */
const ADMIN_EMAIL = 'admin@test.com'
const ADMIN_PASSWORD = 'test1234'
const ADMIN_UID = 'CMWrmo2pHsRiBu5kMj1CDJ23xd72'

export async function adminLogin(username: string, password: string): Promise<void> {
  if (username !== 'test' || password !== 'test') {
    throw new Error('帳號或密碼錯誤')
  }
  await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD)
}

export function isAdminSession(): boolean {
  return auth.currentUser?.uid === ADMIN_UID
}
