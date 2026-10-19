import { Capacitor } from '@capacitor/core'
import { FirebaseAuthentication } from '@capacitor-firebase/authentication'
import {
  browserPopupRedirectResolver,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  isSignInWithEmailLink,
  linkWithCredential,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signInWithPopup,
  signOut,
  updateProfile,
  verifyBeforeUpdateEmail,
  type User as FirebaseUser,
} from 'firebase/auth'

import { auth } from './firebase'
import { lt } from '@/i18n/locale-text'

/**
 * Google 登入 — web uses the JS SDK popup directly. Inside the Android/iOS
 * app a popup can't work (the WebView has no real browser window to open),
 * so the native account picker (@capacitor-firebase/authentication, with
 * skipNativeAuth — see capacitor.config.ts) hands back an ID token that is
 * then exchanged for a normal JS-SDK session, keeping every other service
 * on the same `auth` instance it already uses.
 */
export async function signInWithGoogle(): Promise<FirebaseUser> {
  if (Capacitor.isNativePlatform()) {
    const result = await FirebaseAuthentication.signInWithGoogle()
    const idToken = result.credential?.idToken
    if (!idToken)
      throw new Error(lt('Google 登入未取得憑證', 'Google sign-in returned no credential'))
    const credential = await signInWithCredential(auth, GoogleAuthProvider.credential(idToken))
    return credential.user
  }
  // auth is created via initializeAuth() without a popup resolver (see
  // firebase.ts), so it must be supplied here or this throws auth/argument-error.
  const credential = await signInWithPopup(
    auth,
    new GoogleAuthProvider(),
    browserPopupRedirectResolver,
  )
  return credential.user
}

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
  if (Capacitor.isNativePlatform()) {
    // Clears the native Google account selection too, so the next Google
    // 登入 shows the account picker again instead of silently reusing it.
    await FirebaseAuthentication.signOut().catch(() => {})
  }
  await signOut(auth)
}

/**
 * Firebase's own verification email (VerifyEmailView.vue) — Firebase sends it,
 * no mail server of our own. `languageCode` picks the zh-TW / en template;
 * the link's "continue" button brings the user back to /verify-email on the
 * web app, where the page picks the new verified state up automatically.
 */
export async function sendVerificationEmail(languageCode: string): Promise<void> {
  if (!auth.currentUser) throw new Error('Not authenticated')
  auth.languageCode = languageCode
  await sendEmailVerification(auth.currentUser, { url: verifyEmailContinueUrl() })
}

/** Inside the native app the WebView origin is https://localhost, which the
 *  phone's browser can't open — use the project's hosting domain there. */
function verifyEmailContinueUrl(): string {
  const origin = Capacitor.isNativePlatform()
    ? `https://${import.meta.env.VITE_FIREBASE_AUTH_DOMAIN}`
    : window.location.origin
  return `${origin}/verify-email`
}

const EMAIL_LINK_STORAGE_KEY = 'motoverify:emailLinkFor'

/**
 * Google accounts arrive already `emailVerified` (Google vouches for them),
 * so a plain verification email can't prove anything. Instead Firebase sends
 * an Email-link (passwordless) mail to the Gmail address; opening it links
 * that email-link credential onto the same account (completeEmailLinkVerification),
 * which adds the 'password' provider — something only Firebase can grant, so
 * the client can't fake having confirmed it. Requires "Email link" to be
 * enabled under Authentication › Sign-in method › Email/Password.
 */
export async function sendGoogleAccountVerificationLink(languageCode: string): Promise<void> {
  const email = auth.currentUser?.email
  if (!auth.currentUser || !email) throw new Error('Not authenticated')
  auth.languageCode = languageCode
  await sendSignInLinkToEmail(auth, email, {
    url: verifyEmailContinueUrl(),
    handleCodeInApp: true,
  })
  try {
    localStorage.setItem(EMAIL_LINK_STORAGE_KEY, email)
  } catch {
    // Falls back to the signed-in user's own email when completing.
  }
}

/**
 * Finishes the Google-account email confirmation when /verify-email is
 * opened from the emailed link. Signed in (same browser/app) → links the
 * credential onto the current account. Not signed in (e.g. the phone opened
 * the link in its browser instead of the app) → signs in with the link,
 * which lands on the same account (same email) and records the same
 * provider; the app picks it up on its next reload. Returns false when the
 * URL isn't an email-link at all.
 */
export async function completeEmailLinkVerification(href: string): Promise<boolean> {
  if (!isSignInWithEmailLink(auth, href)) return false
  let stored: string | null
  try {
    stored = localStorage.getItem(EMAIL_LINK_STORAGE_KEY)
  } catch {
    stored = null
  }
  const email = auth.currentUser?.email ?? stored
  if (!email) throw new Error('missing-email')
  if (auth.currentUser) {
    try {
      await linkWithCredential(auth.currentUser, EmailAuthProvider.credentialWithLink(email, href))
    } catch (error) {
      if ((error as { code?: string }).code !== 'auth/provider-already-linked') throw error
    }
  } else {
    await signInWithEmailLink(auth, email, href)
  }
  try {
    localStorage.removeItem(EMAIL_LINK_STORAGE_KEY)
  } catch {
    // best-effort
  }
  return true
}

/** Re-reads the Auth user from the server — e.g. after the backend flipped
 *  `emailVerified`, which the cached client user wouldn't otherwise see. */
export async function reloadCurrentUser(): Promise<FirebaseUser | null> {
  if (!auth.currentUser) return null
  await auth.currentUser.reload()
  await auth.currentUser.getIdToken(true)
  return auth.currentUser
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
