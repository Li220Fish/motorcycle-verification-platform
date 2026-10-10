import { getFirestore } from 'firebase-admin/firestore'

import { broadcastNotification, createNotification } from './notification.service'
import { sendPushToUser } from './push.service'
import type { NotificationInput, NotificationType } from './notification.service'
import type { PushInput } from './push.service'

/** Mirrors src/types/notification.ts's NotificationCategory/NotificationPrefs
 *  on the client — keep both in sync by hand (no shared package between
 *  functions/ and the client app in this project, same as NotificationType
 *  above it). */
export type NotificationCategory = 'chat' | 'trade' | 'discussion' | 'vehicleNews' | 'system'

export interface NotificationPrefs {
  push: boolean
  chat: boolean
  trade: boolean
  discussion: boolean
  vehicleNews: boolean
  system: boolean
}

const DEFAULT_PREFS: NotificationPrefs = {
  push: true,
  chat: true,
  trade: true,
  discussion: true,
  vehicleNews: true,
  system: true,
}

function categoryForType(type: NotificationType): NotificationCategory {
  switch (type) {
    case 'chat_message':
      return 'chat'
    case 'listing_favorited':
    case 'booking_request':
    case 'booking_approved':
    case 'booking_declined':
    case 'vehicle_transferred':
      return 'trade'
    case 'discussion_featured':
    case 'discussion_admin_post':
    case 'discussion_comment':
    case 'discussion_like':
    case 'discussion_reply':
      return 'discussion'
    case 'vehicle_news':
      return 'vehicleNews'
    case 'system':
      return 'system'
  }
}

function resolvePrefs(stored: Partial<NotificationPrefs> | undefined): NotificationPrefs {
  return { ...DEFAULT_PREFS, ...stored }
}

/**
 * Single entry point every notification trigger/onCall function should use
 * instead of calling createNotification/sendPushToUser directly — respects
 * the per-category toggles a user sets in /settings/notifications
 * (src/views/NotificationSettingsView.vue), stored at
 * users/{uid}.notificationPrefs. A missing doc or missing field defaults to
 * `true` (resolvePrefs), so every existing account before this feature
 * shipped keeps getting notified exactly as before until they actually
 * visit the settings page and turn something off.
 *
 * The in-app feed and the OS push are gated independently: switching a
 * category off skips BOTH for that category; the master 推播通知 switch
 * additionally silences push alone (the in-app feed entry still gets
 * written) even when the category itself stays on — same "two separate
 * transports" split push.service.ts's own doc comment already describes.
 */
export async function notifyUser(
  uid: string,
  input: NotificationInput,
  push?: PushInput,
): Promise<void> {
  const db = getFirestore()
  const snap = await db.collection('users').doc(uid).get()
  const prefs = resolvePrefs(
    snap.data()?.notificationPrefs as Partial<NotificationPrefs> | undefined,
  )
  const category = categoryForType(input.type)
  if (!prefs[category]) return

  await createNotification(uid, input)
  if (push && prefs.push) {
    await sendPushToUser(uid, push).catch((error) =>
      console.error(`[notifyUser] push send failed for type ${input.type}:`, error),
    )
  }
}

/**
 * broadcastNotification's prefs-aware counterpart for the 4 broadcast types
 * (system/vehicle_news/discussion_featured/discussion_admin_post) — reads
 * every user's notificationPrefs in the same `.select()` pass
 * broadcastNotification already does to list every uid, filters out whoever
 * has this category off, and hands the rest straight to it. An opted-out
 * user is never written into their own feed even once, not just hidden
 * client-side after the fact.
 */
export async function notifyBroadcast(
  input: NotificationInput,
  excludeUid?: string,
  push?: PushInput,
): Promise<void> {
  const db = getFirestore()
  const category = categoryForType(input.type)
  const usersSnap = await db.collection('users').select('notificationPrefs').get()
  const eligible = usersSnap.docs
    .filter((d) => d.id !== excludeUid)
    .map((d) => ({
      id: d.id,
      prefs: resolvePrefs(d.data().notificationPrefs as Partial<NotificationPrefs> | undefined),
    }))
    .filter((u) => u.prefs[category])

  await broadcastNotification(
    input,
    excludeUid,
    eligible.map((u) => u.id),
  )

  // Opt-in — omitted by every broadcast caller except
  // on-system-announcement-created.ts (the admin backend's 系統公告
  // composer): the other 3 broadcast types (vehicle_news/discussion_
  // featured/discussion_admin_post) only ever wrote the in-app feed before
  // this, and nothing here asked to change that. Same per-user double-gate
  // as notifyUser — a target still needs their own master 推播通知 switch
  // on, not just this category.
  if (push) {
    await Promise.all(
      eligible
        .filter((u) => u.prefs.push)
        .map((u) =>
          sendPushToUser(u.id, push).catch((error) =>
            console.error(`[notifyBroadcast] push send failed for uid ${u.id}:`, error),
          ),
        ),
    )
  }
}
