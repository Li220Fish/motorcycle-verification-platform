import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  verifyBeforeUpdateEmail,
  type User as FirebaseUser,
} from 'firebase/auth'

import { auth } from './firebase'

export function onAuthChange(callback: (user: FirebaseUser | null) => void): () => void {
  return onAuthStateChanged(auth, callback)
}

/**
 * SharedReportView.vue's one caller — lets a stranger who clicked a public
 * report link satisfy firestore.rules' signedIn() (== request.auth != null)
 * with zero friction (no form, no redirect), the same way every isPublic
 * verification/answer/evidence read rule already only ever checks "signed
 * in at all", never "owns an account for longer than this page load". Never
 * called if there's already ANY session (anonymous or real) — see that
 * view's own mount logic.
 */
export async function signInAnonymous(): Promise<FirebaseUser> {
  const credential = await signInAnonymously(auth)
  return credential.user
}

export async function register(
  email: string,
  password: string,
  displayName?: string,
): Promise<FirebaseUser> {
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  if (displayName) {
    await updateProfile(credential.user, { displayName })
  }
  return credential.user
}

export async function login(email: string, password: string): Promise<FirebaseUser> {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  return credential.user
}

export async function logout(): Promise<void> {
  await signOut(auth)
}

export function getCurrentUser(): FirebaseUser | null {
  return auth.currentUser
}

export async function updateDisplayName(displayName: string): Promise<void> {
  if (!auth.currentUser) throw new Error('Not authenticated')
  await updateProfile(auth.currentUser, { displayName })
}

export async function updatePhotoURL(photoURL: string | null): Promise<void> {
  if (!auth.currentUser) throw new Error('Not authenticated')
  await updateProfile(auth.currentUser, { photoURL })
}

/**
 * Changing the Auth email is security-sensitive and Firebase requires a
 * recent sign-in for it — re-authenticate with the current password first,
 * then send a verification link to the NEW address (`verifyBeforeUpdateEmail`,
 * the non-deprecated replacement for `updateEmail`; it also keeps working on
 * projects with Email Enumeration Protection enabled, unlike `updateEmail`).
 * `auth.currentUser.email` only actually changes once the user clicks that
 * link — same "check your inbox" flow as `sendPasswordReset` already uses.
 */
export async function updateEmail(newEmail: string, currentPassword: string): Promise<void> {
  const user = auth.currentUser
  if (!user || !user.email) throw new Error('Not authenticated')
  const credential = EmailAuthProvider.credential(user.email, currentPassword)
  await reauthenticateWithCredential(user, credential)
  await verifyBeforeUpdateEmail(user, newEmail)
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email)
}
