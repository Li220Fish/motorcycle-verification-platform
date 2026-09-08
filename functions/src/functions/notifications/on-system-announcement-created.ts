import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { broadcastNotification } from '../../services/notification.service'

interface SystemAnnouncementDoc {
  title: string
  body: string
}

/** Written only by the admin webapp's broadcast composer (see
 *  admin-data.service.ts's sendSystemAnnouncement — firestore.rules gates
 *  the write to isAdmin()). */
export const onSystemAnnouncementCreated = onDocumentCreated(
  'systemAnnouncements/{announcementId}',
  async (event) => {
    const announcement = event.data?.data() as SystemAnnouncementDoc | undefined
    if (!announcement) return

    await broadcastNotification({
      type: 'system',
      title: announcement.title,
      body: announcement.body,
      link: '/notifications',
    })
  },
)
