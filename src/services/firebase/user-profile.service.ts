import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore'

import { db } from './firebase'

/**
 * Firebase Auth has no client-listable "all users" API — only the Admin SDK
 * can enumerate accounts, and this app deliberately has no Admin SDK/service
 * account (see scripts/seed-test-users.mjs's own comment on that). The
 * RiDE 營運後台 (/admin) user roster instead reads this Firestore
 * mirror of each signed-in user's own basic identity, kept current here on
 * every auth state resolution. `users/{uid}` already allows a user to write
 * their own doc (firestore.rules), so this needs no new rule.
 */
/**
 * `photoUrl`: pass Firebase Auth's `photoURL` when it's on hand (the
 * onAuthChange callback has it); omit it from a call site that only has the
 * app-side User model (e.g. after a display-name-only change) and the
 * existing stored value is preserved instead of being clobbered with null.
 */
async function touchUserProfile(
  uid: string,
  email: string,
  displayName: string | null,
  photoUrl?: string | null,
): Promise<void> {
  const ref = doc(db, 'users', uid)
  const existing = await getDoc(ref)
  const existingData = existing.data()
  const resolvedPhotoUrl = photoUrl !== undefined ? photoUrl : (existingData?.photoUrl ?? null)
  await setDoc(
    ref,
    {
      uid,
      email,
      displayName,
      photoUrl: resolvedPhotoUrl,
      accountTier: existingData?.accountTier ?? 'standard',
      // 交易評分 — starts at 0 for everyone, only ever moved by a Trusted
      // Backend once the +/- scoring mechanic exists (see transactions/{id}
      // and this doc's own `score` guard in firestore.rules); round-tripping
      // the existing value here (never resetting it) is what that guard
      // actually enforces on every sign-in touch.
      score: existingData?.score ?? 0,
      createdAt: existingData?.createdAt ?? serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
    },
    { merge: true },
  )
  // Kept in sync here (every sign-in + every explicit avatar change) rather
  // than only from updateAvatarUrl, so every EXISTING account backfills its
  // publicAvatars doc automatically the next time it simply signs in —
  // no separate migration script needed.
  await setDoc(doc(db, 'publicAvatars', uid), { photoUrl: resolvedPhotoUrl }, { merge: true })
}

/**
 * Live view of the signed-in user's OWN users/{uid} doc — the piece
 * auth.store.ts's `user.value.photoUrl`/`displayName` used to be missing:
 * Firebase Auth's `firebaseUser.photoURL`/`displayName` are a LOCAL cache
 * populated at sign-in/token-refresh time, not a realtime subscription, so
 * a change made anywhere else (another tab, another device, an admin/backend
 * write straight to Firestore) never reaches an already-open session until
 * that session happens to re-authenticate. Subscribing to the Firestore
 * mirror doc instead — which this same profile is already kept current in
 * via touchUserProfile()/updateAvatarUrl() — makes "my own avatar" reflect
 * any change immediately, in every open tab, with no refresh or re-login
 * needed (found 2026-09: a stale cached photoURL survived a page reload and
 * pointed at a since-deleted Storage file, rendering as a broken image).
 */
function subscribeOwnProfile(
  uid: string,
  onChange: (profile: { displayName: string | null; photoUrl: string | null }) => void,
): Unsubscribe {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    const data = snap.data()
    if (!data) return
    onChange({ displayName: data.displayName ?? null, photoUrl: data.photoUrl ?? null })
  })
}

/**
 * Live per-uid avatar lookup for rendering ANY other user's photo (chat
 * member, discussion post/comment author) — reads `publicAvatars/{uid}`
 * instead of the frozen `photoUrl` copy baked into memberSnapshots/
 * authorSnapshot at write time, so a later avatar change is reflected
 * immediately everywhere that uid is shown, not just the next time that
 * user happens to send a message/post again. See the useLiveAvatar
 * composable for the subscribe/unsubscribe lifecycle around this.
 *
 * Reports `undefined` (not `null`) when the doc doesn't exist at all yet —
 * distinct from an existing doc whose `photoUrl` is genuinely `null` — so
 * useLiveAvatar knows to keep showing its frozen-snapshot fallback rather
 * than an authoritative "no avatar" for a user who simply hasn't signed in
 * since publicAvatars was introduced (touchUserProfile backfills it on
 * every sign-in, so this is self-healing, just not instant for everyone).
 */
function subscribePublicAvatar(
  uid: string,
  onChange: (photoUrl: string | null | undefined) => void,
): Unsubscribe {
  return onSnapshot(doc(db, 'publicAvatars', uid), (snap) => {
    if (!snap.exists()) {
      onChange(undefined)
      return
    }
    onChange((snap.data().photoUrl as string | null | undefined) ?? null)
  })
}

export const userProfileService = {
  touchUserProfile,
  subscribeOwnProfile,
  subscribePublicAvatar,
}
