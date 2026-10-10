import { getFirestore, Timestamp } from 'firebase-admin/firestore'

/** Mirrors src/types/notification.ts's NotificationType on the client —
 *  keep both in sync by hand (no shared package between functions/ and the
 *  client app in this project). */
export type NotificationType =
  | 'chat_message'
  | 'listing_favorited'
  | 'booking_request'
  | 'booking_approved'
  | 'booking_declined'
  | 'system'
  | 'vehicle_news'
  | 'discussion_featured'
  | 'discussion_admin_post'
  | 'discussion_comment'
  | 'discussion_like'
  | 'discussion_reply'
  | 'vehicle_transferred'

export interface NotificationInput {
  type: NotificationType
  title: string
  body: string
  link?: string
}

/** Writes one notification into a single user's feed
 *  (users/{uid}/notifications/{id}) — the only writer of this subcollection,
 *  per firestore.rules (client may only read its own feed / flip `read`). */
export async function createNotification(uid: string, input: NotificationInput): Promise<void> {
  const db = getFirestore()
  await db
    .collection('users')
    .doc(uid)
    .collection('notifications')
    .add({
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link ?? null,
      read: false,
      createdAt: Timestamp.now(),
    })
}

// Stay comfortably under Firestore's 500-write-per-batch cap.
const BATCH_SIZE = 450

/** Fans a notification out to every user in the system (system/admin/news/
 *  featured broadcasts) — O(user count) writes, batched. Fine at this app's
 *  current scale; a genuinely large user base would need a queue-backed
 *  fan-out instead of one Function invocation doing it all synchronously.
 *
 *  `targetUids`, when given, replaces the "every user" query with that exact
 *  list — used by notification-dispatch.service.ts's notifyBroadcast, which
 *  has already filtered out whoever has this category's notificationPrefs
 *  switched off before calling here. */
export async function broadcastNotification(
  input: NotificationInput,
  excludeUid?: string,
  targetUids?: string[],
): Promise<void> {
  const db = getFirestore()
  let uids = targetUids
  if (!uids) {
    const usersSnap = await db.collection('users').select().get()
    uids = usersSnap.docs.map((d) => d.id)
  }
  const finalTargetUids = uids.filter((uid) => uid !== excludeUid)

  for (let i = 0; i < finalTargetUids.length; i += BATCH_SIZE) {
    const batch = db.batch()
    for (const uid of finalTargetUids.slice(i, i + BATCH_SIZE)) {
      const ref = db.collection('users').doc(uid).collection('notifications').doc()
      batch.set(ref, {
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link ?? null,
        read: false,
        createdAt: Timestamp.now(),
      })
    }
    await batch.commit()
  }
}
