import { FieldValue, getFirestore } from 'firebase-admin/firestore'

import { COLLECTIONS } from '../config'
import { clampText, type LineApi } from '../line/line-api'

/** Same admins as RiDE (firestore.rules isAdmin / functions auth.service.ts). */
const ADMIN_UIDS: readonly string[] = ['CMWrmo2pHsRiBu5kMj1CDJ23xd72', 'yByQ86E0oCeIJYGv2fmTRIvOhCI3']

export async function isStaff(uid: string | undefined): Promise<boolean> {
  if (!uid) return false
  if (ADMIN_UIDS.includes(uid)) return true
  return (await getFirestore().collection(COLLECTIONS.staff).doc(uid).get()).exists
}

/** Users created by the console simulator — never pushed to real LINE. */
export function isSimulatedUser(lineUserId: string): boolean {
  return lineUserId.startsWith('sim-')
}

/**
 * Delivers a staff reply written by the console to the LINE user, then
 * records the outcome on the message and the ticket.
 */
export async function deliverStaffMessage(params: {
  ticketId: string
  messageId: string
  message: Record<string, unknown>
  line: LineApi | null
}): Promise<'sent' | 'failed' | 'simulated' | 'skipped'> {
  const { message } = params
  if (message.from !== 'staff' || message.delivery !== 'pending') return 'skipped'
  const db = getFirestore()
  const ticketRef = db.collection(COLLECTIONS.tickets).doc(params.ticketId)
  const messageRef = ticketRef.collection('messages').doc(params.messageId)
  const ticket = (await ticketRef.get()).data()
  const lineUserId = ticket?.lineUserId as string | undefined

  let delivery: 'sent' | 'failed' | 'simulated' = 'simulated'
  let error: string | null = null
  if (lineUserId && params.line && !isSimulatedUser(lineUserId)) {
    try {
      const name = typeof message.staffName === 'string' && message.staffName ? message.staffName : '團隊成員'
      await params.line.push(lineUserId, [{ type: 'text', text: clampText(`💬 ${name}：\n${String(message.text ?? '')}`) }])
      delivery = 'sent'
    } catch (pushError) {
      delivery = 'failed'
      error = String(pushError).slice(0, 300)
    }
  }

  await messageRef.update({ delivery, deliveryError: error, deliveredAt: FieldValue.serverTimestamp() })
  await ticketRef.update({
    messageCount: FieldValue.increment(1),
    lastMessagePreview: String(message.text ?? '').slice(0, 80),
    lastMessageFrom: 'staff',
    lastMessageAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    ...(ticket?.status === 'open' ? { status: 'in_progress' } : {}),
    ...(ticket?.assigneeUid ? {} : { assigneeUid: message.staffUid ?? null, assigneeName: message.staffName ?? null }),
  })
  return delivery
}
