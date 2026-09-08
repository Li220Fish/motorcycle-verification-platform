import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'

import { db } from './firebase'
import type { AppNotification, NotificationType } from '@/types/notification'

const PAGE_SIZE = 50

interface NotificationDoc {
  type: NotificationType
  title: string
  body: string
  link: string | null
  read: boolean
  createdAt: Timestamp
}

function toNotification(id: string, data: NotificationDoc): AppNotification {
  return {
    id,
    type: data.type,
    title: data.title,
    body: data.body,
    link: data.link ?? null,
    read: !!data.read,
    createdAt: data.createdAt?.toMillis() ?? 0,
  }
}

function notificationsCollection(uid: string) {
  return collection(db, 'users', uid, 'notifications')
}

/** All notification docs are written server-side (Cloud Functions triggers,
 *  see functions/src/functions/notifications/) — the client only ever reads
 *  its own feed and toggles `read`, matching firestore.rules' allow-list for
 *  this subcollection. */
function subscribeNotifications(
  uid: string,
  onChange: (notifications: AppNotification[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(notificationsCollection(uid), orderBy('createdAt', 'desc'), limit(PAGE_SIZE))
  return onSnapshot(
    q,
    (snapshot) => {
      onChange(snapshot.docs.map((d) => toNotification(d.id, d.data() as NotificationDoc)))
    },
    (error) => onError?.(error),
  )
}

async function markAsRead(uid: string, notificationId: string): Promise<void> {
  await updateDoc(doc(notificationsCollection(uid), notificationId), { read: true })
}

async function markAllAsRead(uid: string, unreadIds: string[]): Promise<void> {
  if (unreadIds.length === 0) return
  const batch = writeBatch(db)
  for (const id of unreadIds) {
    batch.update(doc(notificationsCollection(uid), id), { read: true })
  }
  await batch.commit()
}

export const notificationService = { subscribeNotifications, markAsRead, markAllAsRead }
