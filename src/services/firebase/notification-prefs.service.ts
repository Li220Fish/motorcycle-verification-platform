import { doc, getDoc, setDoc } from 'firebase/firestore'

import { db } from './firebase'
import { DEFAULT_NOTIFICATION_PREFS } from '@/types/notification'
import type { NotificationPrefs } from '@/types/notification'

/**
 * users/{uid}.notificationPrefs — gates both the in-app /notifications feed
 * and OS push per category, enforced server-side by every Cloud Function
 * notification trigger (functions/src/services/notification-dispatch
 * .service.ts's notifyUser/notifyBroadcast, the one place those triggers
 * actually send through now). `users/{uid}` already allows a user to write
 * their own doc (firestore.rules), so this needs no new rule.
 *
 * A missing doc or missing field defaults to `true` — a pre-existing
 * account, or a category added after this feature shipped that nobody has
 * touched yet, keeps getting notified exactly as before until the user
 * actually opens /settings/notifications and turns something off.
 */
async function getPrefs(uid: string): Promise<NotificationPrefs> {
  const snap = await getDoc(doc(db, 'users', uid))
  const stored = snap.data()?.notificationPrefs as Partial<NotificationPrefs> | undefined
  return { ...DEFAULT_NOTIFICATION_PREFS, ...stored }
}

/** `setDoc(..., {merge: true})` deep-merges nested map fields, so a partial
 *  patch (one toggle flipped) only ever touches that one sub-field of
 *  notificationPrefs — every other category's current value survives. */
async function updatePrefs(uid: string, patch: Partial<NotificationPrefs>): Promise<void> {
  await setDoc(doc(db, 'users', uid), { notificationPrefs: patch }, { merge: true })
}

export const notificationPrefsService = { getPrefs, updatePrefs }
