import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'

import { db } from './firebase'

/**
 * Firebase Auth has no client-listable "all users" API — only the Admin SDK
 * can enumerate accounts, and this app deliberately has no Admin SDK/service
 * account (see scripts/seed-test-users.mjs's own comment on that). The
 * MotoVerify 營運後台 (/admin) user roster instead reads this Firestore
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
  await setDoc(
    ref,
    {
      uid,
      email,
      displayName,
      photoUrl: photoUrl !== undefined ? photoUrl : (existingData?.photoUrl ?? null),
      accountTier: existingData?.accountTier ?? 'standard',
      createdAt: existingData?.createdAt ?? serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export const userProfileService = { touchUserProfile }
