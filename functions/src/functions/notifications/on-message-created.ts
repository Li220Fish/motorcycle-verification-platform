import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { getFirestore } from 'firebase-admin/firestore'
import { createNotification } from '../../services/notification.service'

interface MessageDoc {
  senderId: string
  type: 'text' | 'image' | 'vehicle' | 'verification_report' | 'system'
  text?: string
}

interface ConversationDoc {
  memberIds: string[]
  memberSnapshots: Record<string, { displayName: string }>
  mutedBy?: string[]
}

const PREVIEW_BY_TYPE: Record<MessageDoc['type'], string> = {
  text: '',
  image: '傳送了一張照片',
  vehicle: '分享了一台車輛',
  verification_report: '分享了一份驗車報告',
  system: '',
}

export const onMessageCreated = onDocumentCreated(
  'conversations/{conversationId}/messages/{messageId}',
  async (event) => {
    const message = event.data?.data() as MessageDoc | undefined
    if (!message || message.type === 'system') return

    const { conversationId } = event.params
    const db = getFirestore()
    const convoSnap = await db.collection('conversations').doc(conversationId).get()
    const convo = convoSnap.data() as ConversationDoc | undefined
    if (!convo) return

    const senderName = convo.memberSnapshots?.[message.senderId]?.displayName ?? '有人'
    const preview = message.type === 'text' ? (message.text ?? '') : PREVIEW_BY_TYPE[message.type]
    const mutedBy = convo.mutedBy ?? []

    for (const uid of convo.memberIds ?? []) {
      if (uid === message.senderId || mutedBy.includes(uid)) continue
      await createNotification(uid, {
        type: 'chat_message',
        title: senderName,
        body: preview,
        link: `/messages/${conversationId}`,
      })
    }
  },
)
