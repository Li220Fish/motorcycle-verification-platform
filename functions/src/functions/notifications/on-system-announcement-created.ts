import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { notifyBroadcast } from '../../services/notification-dispatch.service'

interface SystemAnnouncementDoc {
  title: string
  body: string
}

/** Written only by the admin webapp's broadcast composer (see
 *  admin-data.service.ts's sendSystemAnnouncement — firestore.rules gates
 *  the write to isAdmin()). The only broadcast type that also sends a real
 *  OS-level push (notifyBroadcast's 3rd argument) — the admin backend's
 *  whole reason for sending a 系統公告 is to reach someone who isn't
 *  sitting in the app right now, so an in-app-feed-only entry they'd only
 *  see on their next visit defeats the point. */
export const onSystemAnnouncementCreated = onDocumentCreated(
  'systemAnnouncements/{announcementId}',
  async (event) => {
    const announcement = event.data?.data() as SystemAnnouncementDoc | undefined
    if (!announcement) return

    await notifyBroadcast(
      {
        type: 'system',
        title: announcement.title,
        body: announcement.body,
        link: '/notifications',
      },
      undefined,
      { title: announcement.title, body: announcement.body, link: '/notifications' },
    )
  },
)
