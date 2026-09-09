import {
  collection,
  deleteDoc,
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

/** NotificationsView.vue only ever shows the latest 40 (its own requirement,
 *  independent of any client-side grouping/dedup it does on top of this
 *  raw feed) — no pagination UI exists beyond that. */
const PAGE_SIZE = 40

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

/** Also used to mark every notification underneath a collapsed 訊息 group as
 *  read at once (NotificationsView.vue), not just "mark all as read" — the
 *  name stays generic since both call sites just want "these specific ids,
 *  flipped to read". */
async function markManyAsRead(uid: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const batch = writeBatch(db)
  for (const id of ids) {
    batch.update(doc(notificationsCollection(uid), id), { read: true })
  }
  await batch.commit()
}

async function deleteOne(uid: string, notificationId: string): Promise<void> {
  await deleteDoc(doc(notificationsCollection(uid), notificationId))
}

/** Swipe-to-delete on a collapsed 訊息 group deletes every underlying doc it
 *  represents, not just the one shown — otherwise an older hidden message
 *  from the same conversation would "resurface" after the visible one is
 *  removed. Also backs 清除全部. */
async function deleteMany(uid: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const batch = writeBatch(db)
  for (const id of ids) {
    batch.delete(doc(notificationsCollection(uid), id))
  }
  await batch.commit()
}

export const notificationService = {
  subscribeNotifications,
  markAsRead,
  markManyAsRead,
  deleteOne,
  deleteMany,
}
