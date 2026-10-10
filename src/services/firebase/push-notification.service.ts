import { PushNotifications } from '@capacitor/push-notifications'
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore'

import router from '@/router'
import { platformService } from '@/services/platform/platform.service'
import { db } from './firebase'

/**
 * Native OS-level push notifications (e.g. a chat message arriving while
 * the app is closed/backgrounded) — distinct from notification.service.ts's
 * in-app `users/{uid}/notifications` feed, which only ever shows once the
 * app itself is open. Doc id under `users/{uid}/fcmTokens/{token}` is the
 * token itself, so re-registering the same device is a plain overwrite —
 * no need to track "do I already have this one" client-side. Web has no
 * push transport here at all (no service worker registered for it), so
 * every call below is a no-op there.
 */

let listenersReady = false
let currentUid: string | null = null

function tokenDocRef(uid: string, token: string) {
  return doc(db, 'users', uid, 'fcmTokens', token)
}

async function saveToken(uid: string, token: string): Promise<void> {
  try {
    await setDoc(tokenDocRef(uid, token), {
      platform: platformService.getPlatform(),
      createdAt: serverTimestamp(),
    })
  } catch (error) {
    console.error('[push-notification.service] failed to save token:', error)
  }
}

/** Tapping a delivered notification — navigates to whatever `link` the
 *  sending Cloud Function put in the data payload (see
 *  functions/src/services/push.service.ts), same `/messages/{id}` style
 *  path the in-app notification feed already uses for the same event. */
function handleActionPerformed(link: unknown): void {
  if (typeof link === 'string' && link) void router.push(link)
}

/**
 * Registers this device for push and stores its token — call once per
 * signed-in session (auth.store.ts's onAuthChange), safe to call again on
 * every login. Listener wiring only happens once per app lifetime;
 * `currentUid` is updated on every call so a token that arrives after a
 * user switch (logout + different login, same app session) still saves
 * under the right uid.
 */
async function initialize(uid: string): Promise<void> {
  if (!platformService.isNative()) return
  currentUid = uid

  if (!listenersReady) {
    listenersReady = true
    PushNotifications.addListener('registration', (token) => {
      if (currentUid) void saveToken(currentUid, token.value)
    })
    PushNotifications.addListener('registrationError', (error) => {
      console.error('[push-notification.service] registration failed:', error)
    })
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      handleActionPerformed(action.notification.data?.link)
    })
  }

  const status = await PushNotifications.checkPermissions()
  const granted =
    status.receive === 'granted'
      ? true
      : (await PushNotifications.requestPermissions()).receive === 'granted'
  if (!granted) return

  await PushNotifications.register()
}

/** Best-effort — deletes this device's own token doc so the backend stops
 *  sending it push after the user signs out. Not wired to the logout flow
 *  yet (out of scope for the initial feature); exported so that can be
 *  added without touching this service again. */
async function forgetToken(uid: string, token: string): Promise<void> {
  await deleteDoc(tokenDocRef(uid, token)).catch(() => {})
}

export const pushNotificationService = { initialize, forgetToken }
