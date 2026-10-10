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

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  link: string | null
  read: boolean
  createdAt: number
}

/** Mirrors functions/src/services/notification-dispatch.service.ts's
 *  NotificationCategory — keep both in sync by hand. Every NotificationType
 *  above maps to exactly one of these; see that file's categoryForType. */
export type NotificationCategory = 'chat' | 'trade' | 'discussion' | 'vehicleNews' | 'system'

/** users/{uid}.notificationPrefs — read/written by
 *  src/services/firebase/notification-prefs.service.ts, enforced server-side
 *  by every Cloud Function trigger via notifyUser/notifyBroadcast (see
 *  notification-dispatch.service.ts). `push` is a master switch for the
 *  OS-level push transport alone; the in-app /notifications feed is governed
 *  only by the 5 category toggles. */
export interface NotificationPrefs {
  push: boolean
  chat: boolean
  trade: boolean
  discussion: boolean
  vehicleNews: boolean
  system: boolean
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  push: true,
  chat: true,
  trade: true,
  discussion: true,
  vehicleNews: true,
  system: true,
}
