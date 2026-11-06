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
/** Exported so other parts of the main app (not just /admin) can recognize
 *  admin-authored content by authorId — e.g. discussion.store.ts's "官方"
 *  badge and the discussion_admin_post notification trigger's client-side
 *  counterpart. Same uid firestore.rules' isAdmin() and functions/src/
 *  services/auth.service.ts's isAdminUid() hardcode — keep all of them in
 *  lockstep by hand. One admin@test.com per Firebase project: staging
 *  (motorcycle-verification) and production (ride78). A uid only exists in
 *  its own project, so listing both never grants anything cross-project. */
export const ADMIN_UIDS: readonly string[] = [
  'CMWrmo2pHsRiBu5kMj1CDJ23xd72', // staging
  'yByQ86E0oCeIJYGv2fmTRIvOhCI3', // production (ride78)
]

export function isAdminUid(uid: string | null | undefined): boolean {
  return !!uid && ADMIN_UIDS.includes(uid)
}

export async function adminLogin(username: string, password: string): Promise<void> {
  if (username !== 'test' || password !== 'test') {
    throw new Error('帳號或密碼錯誤')
  }
  await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD)
}

export function isAdminSession(): boolean {
  return isAdminUid(auth.currentUser?.uid)
}
