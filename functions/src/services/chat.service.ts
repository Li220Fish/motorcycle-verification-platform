import { getFirestore, FieldValue } from 'firebase-admin/firestore'

/**
 * Admin SDK equivalent of src/services/chat/chat.service.ts's sendSystemNote
 * — same message/conversation doc shape, just from a Trusted Backend
 * context with no real "sender" (e.g. onAppointmentDealConfirmed.ts posting
 * the auto-generated 轉移碼 once both sides confirm a deal). ChatBubble.vue
 * renders `type: 'system'` messages centered with no sender name/avatar, so
 * which uid ends up in `senderId` here is cosmetically irrelevant — pass
 * whichever side's uid is convenient.
 */
export async function sendSystemMessage(
  conversationId: string,
  senderId: string,
  otherMemberIds: string[],
  text: string,
): Promise<void> {
  const db = getFirestore()
  const batch = db.batch()
  const messageRef = db.collection('conversations').doc(conversationId).collection('messages').doc()
  batch.set(messageRef, {
    senderId,
    type: 'system',
    text,
    createdAt: FieldValue.serverTimestamp(),
  })

  const unreadUpdates: Record<string, unknown> = {}
  for (const uid of otherMemberIds) {
    unreadUpdates[`unreadCounts.${uid}`] = FieldValue.increment(1)
  }
  batch.update(db.collection('conversations').doc(conversationId), {
    lastMessage: { type: 'system', text, senderId, createdAt: FieldValue.serverTimestamp() },
    lastMessageAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    ...unreadUpdates,
  })

  await batch.commit()
}
