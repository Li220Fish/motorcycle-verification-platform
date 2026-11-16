import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

import { COLLECTIONS, STORAGE_ROOT } from '../config'
import type { LineProfile } from './line-api'

export type TicketCategory = 'report' | 'human' | 'check_followup'
export type TicketStatus = 'open' | 'in_progress' | 'resolved'
export type MessageFrom = 'user' | 'staff' | 'bot' | 'system'
export type MessageType = 'text' | 'image' | 'audio' | 'video' | 'file' | 'check'
export type Delivery = 'pending' | 'sent' | 'failed' | 'simulated' | 'n/a'

export interface TicketMessage {
  from: MessageFrom
  type: MessageType
  text: string | null
  mediaPath?: string | null
  contentType?: string | null
  checkId?: string | null
  staffUid?: string | null
  staffName?: string | null
  delivery: Delivery
}

const db = () => getFirestore()

export function preview(message: Pick<TicketMessage, 'type' | 'text'>): string {
  if (message.type === 'text') return (message.text ?? '').slice(0, 80)
  return { image: '[照片]', audio: '[錄音]', video: '[影片]', file: '[檔案]', check: '[檢測結果]' }[message.type] ?? ''
}

/** Creates or refreshes the LINE user's doc (profile fetched once). */
export async function touchUser(
  lineUserId: string,
  loadProfile: () => Promise<LineProfile | null>,
  extra: Record<string, unknown> = {},
): Promise<{ displayName: string | null; openTicketId: string | null }> {
  const ref = db().collection(COLLECTIONS.users).doc(lineUserId)
  const snap = await ref.get()
  const data = snap.data()
  if (!snap.exists) {
    const profile = await loadProfile().catch(() => null)
    await ref.set({
      lineUserId,
      displayName: profile?.displayName ?? null,
      pictureUrl: profile?.pictureUrl ?? null,
      followed: true,
      openTicketId: null,
      checkCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      lastSeenAt: FieldValue.serverTimestamp(),
      ...extra,
    })
    return { displayName: profile?.displayName ?? null, openTicketId: null }
  }
  await ref.update({ lastSeenAt: FieldValue.serverTimestamp(), ...extra })
  return { displayName: (data?.displayName as string) ?? null, openTicketId: (data?.openTicketId as string) ?? null }
}

/** Reuses the user's open ticket, or opens a new one. */
export async function openTicket(params: {
  lineUserId: string
  displayName: string | null
  category: TicketCategory
  checkId?: string | null
}): Promise<{ ticketId: string; created: boolean }> {
  const userRef = db().collection(COLLECTIONS.users).doc(params.lineUserId)
  return db().runTransaction(async (tx) => {
    const user = await tx.get(userRef)
    const existing = user.data()?.openTicketId as string | null | undefined
    if (existing) {
      const ticket = await tx.get(db().collection(COLLECTIONS.tickets).doc(existing))
      if (ticket.exists && ticket.data()?.status !== 'resolved') {
        // Asking for a human upgrades a plain report.
        if (params.category === 'human' && ticket.data()?.category !== 'human') {
          tx.update(ticket.ref, { category: 'human', unreadForStaff: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() })
        }
        return { ticketId: existing, created: false }
      }
    }
    const ticketRef = db().collection(COLLECTIONS.tickets).doc()
    tx.set(ticketRef, {
      lineUserId: params.lineUserId,
      userName: params.displayName,
      category: params.category,
      status: 'open' as TicketStatus,
      checkId: params.checkId ?? null,
      assigneeUid: null,
      assigneeName: null,
      labels: [],
      staffNote: '',
      unreadForStaff: 1,
      messageCount: 0,
      lastMessagePreview: '',
      lastMessageFrom: null,
      lastMessageAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    tx.set(userRef, { openTicketId: ticketRef.id }, { merge: true })
    return { ticketId: ticketRef.id, created: true }
  })
}

export async function appendMessage(ticketId: string, message: TicketMessage): Promise<string> {
  const ticketRef = db().collection(COLLECTIONS.tickets).doc(ticketId)
  const messageRef = ticketRef.collection('messages').doc()
  const batch = db().batch()
  batch.set(messageRef, { ...message, createdAt: FieldValue.serverTimestamp() })
  batch.update(ticketRef, {
    messageCount: FieldValue.increment(1),
    lastMessagePreview: preview(message),
    lastMessageFrom: message.from,
    lastMessageAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    ...(message.from === 'user' ? { unreadForStaff: FieldValue.increment(1) } : {}),
    // A user writing again re-opens a ticket staff had marked resolved.
    ...(message.from === 'user' ? { status: 'open' } : {}),
  })
  await batch.commit()
  return messageRef.id
}

export async function closeTicket(lineUserId: string): Promise<string | null> {
  const userRef = db().collection(COLLECTIONS.users).doc(lineUserId)
  const ticketId = ((await userRef.get()).data()?.openTicketId as string | null) ?? null
  if (!ticketId) return null
  await db().collection(COLLECTIONS.tickets).doc(ticketId).update({
    status: 'resolved',
    closedBy: 'user',
    updatedAt: FieldValue.serverTimestamp(),
  })
  await userRef.update({ openTicketId: null })
  return ticketId
}

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'audio/x-m4a': 'm4a',
  'audio/m4a': 'm4a',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
  'video/mp4': 'mp4',
}

export async function saveTicketMedia(
  ticketId: string,
  messageId: string,
  content: { buffer: Buffer; contentType: string },
): Promise<string> {
  const extension = EXTENSIONS[content.contentType] ?? 'bin'
  const path = `${STORAGE_ROOT}/tickets/${ticketId}/${messageId}.${extension}`
  await getStorage().bucket().file(path).save(content.buffer, { contentType: content.contentType })
  return path
}
