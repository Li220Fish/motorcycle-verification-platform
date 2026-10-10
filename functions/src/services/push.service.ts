import { getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'

export interface PushInput {
  title: string
  body: string
  /** Client-side route to open on tap (push-notification.service.ts's
   *  pushNotificationActionPerformed listener) — same path shape as the
   *  in-app notification feed's `link` (e.g. `/messages/{conversationId}`). */
  link?: string
}

/** Error codes FCM returns for a token that will never work again (app
 *  uninstalled, token rotated out from under us, etc.) — worth deleting so
 *  future sends don't keep paying the round trip. Anything else (rate
 *  limit, transient server error) is left alone; it might succeed next
 *  time. */
const DEAD_TOKEN_ERROR_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
])

/**
 * Sends an OS-level push to every device this uid has registered
 * (users/{uid}/fcmTokens, written by push-notification.service.ts) — a
 * separate transport from notification.service.ts's in-app feed, which
 * only surfaces once the app itself is open. Silently does nothing if the
 * user has no registered device (web-only user, push permission denied,
 * never opened the native app) — this is a best-effort delivery on top of
 * the in-app feed, never the only record of the event.
 */
export async function sendPushToUser(uid: string, input: PushInput): Promise<void> {
  const db = getFirestore()
  const tokensSnap = await db.collection('users').doc(uid).collection('fcmTokens').get()
  if (tokensSnap.empty) return

  const tokens = tokensSnap.docs.map((d) => d.id)
  const response = await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title: input.title, body: input.body },
    data: input.link ? { link: input.link } : {},
  })

  const deadTokens = response.responses
    .map((result, i) => ({ result, token: tokens[i] }))
    .filter(({ result }) => !result.success && DEAD_TOKEN_ERROR_CODES.has(result.error?.code ?? ''))
    .map(({ token }) => token)

  await Promise.all(
    deadTokens.map((token) =>
      db.collection('users').doc(uid).collection('fcmTokens').doc(token).delete(),
    ),
  )
}
