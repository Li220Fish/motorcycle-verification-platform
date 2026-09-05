import {
  collection,
  doc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  Timestamp,
  writeBatch,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'

import { db } from '@/services/firebase/firebase'
import type { ChatMessage, MessageType } from './chat.types'

const CONVERSATIONS = 'conversations'
const MESSAGES = 'messages'
const PAGE_SIZE = 30

interface MessageDoc {
  senderId: string
  type: MessageType
  text?: string
  imageUrl?: string
  vehicleId?: string
  verificationId?: string
  createdAt: Timestamp
}

function toMessage(id: string, data: MessageDoc): ChatMessage {
  return {
    id,
    senderId: data.senderId,
    type: data.type,
    text: data.text,
    imageUrl: data.imageUrl,
    vehicleId: data.vehicleId,
    verificationId: data.verificationId,
    createdAt: data.createdAt?.toMillis() ?? Date.now(),
  }
}

function messagesCollection(conversationId: string) {
  return collection(db, CONVERSATIONS, conversationId, MESSAGES)
}

/**
 * Firestore generates the doc ID client-side before any write happens, so
 * callers that need the future message's ID up front (e.g. to build the
 * Storage path for an image attachment before the message itself exists)
 * can reserve it here without an extra round trip.
 */
function reserveMessageId(conversationId: string): string {
  return doc(messagesCollection(conversationId)).id
}

/**
 * Live view of the most recent PAGE_SIZE messages, oldest-first for direct
 * rendering. Re-subscribing (e.g. after loadOlderMessages prepends history)
 * is intentionally NOT needed — this only ever tracks the tail of the log.
 */
function subscribeLatestMessages(
  conversationId: string,
  onChange: (messages: ChatMessage[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    messagesCollection(conversationId),
    orderBy('createdAt', 'desc'),
    limit(PAGE_SIZE),
  )
  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs
        .map((docSnapshot) => toMessage(docSnapshot.id, docSnapshot.data() as MessageDoc))
        .reverse()
      onChange(messages)
    },
    (error) => onError?.(error),
  )
}

/** One-shot page of older history, for "load more" above the live tail. */
async function loadOlderMessages(
  conversationId: string,
  beforeCreatedAt: number,
): Promise<ChatMessage[]> {
  const q = query(
    messagesCollection(conversationId),
    orderBy('createdAt', 'desc'),
    startAfter(Timestamp.fromMillis(beforeCreatedAt)),
    limit(PAGE_SIZE),
  )
  const { getDocs } = await import('firebase/firestore')
  const snapshot = await getDocs(q)
  return snapshot.docs
    .map((docSnapshot: QueryDocumentSnapshot) =>
      toMessage(docSnapshot.id, docSnapshot.data() as MessageDoc),
    )
    .reverse()
}

interface SendMessageInput {
  conversationId: string
  senderId: string
  otherMemberIds: string[]
  type: MessageType
  text?: string
  imageUrl?: string
  previewText: string
  messageId?: string
}

/**
 * Writes the message and updates the parent conversation's lastMessage /
 * unread counters in one batch so a reader never observes a conversation
 * row pointing at a message that hasn't landed yet (or vice versa).
 */
async function send(input: SendMessageInput): Promise<void> {
  const batch = writeBatch(db)
  const messageRef = input.messageId
    ? doc(messagesCollection(input.conversationId), input.messageId)
    : doc(messagesCollection(input.conversationId))
  batch.set(messageRef, {
    senderId: input.senderId,
    type: input.type,
    ...(input.text !== undefined ? { text: input.text } : {}),
    ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
    createdAt: serverTimestamp(),
  })

  const conversationRef = doc(db, CONVERSATIONS, input.conversationId)
  const unreadUpdates: Record<string, unknown> = {}
  for (const uid of input.otherMemberIds) {
    unreadUpdates[`unreadCounts.${uid}`] = increment(1)
  }
  batch.update(conversationRef, {
    lastMessage: {
      type: input.type,
      text: input.previewText,
      senderId: input.senderId,
      createdAt: serverTimestamp(),
    },
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...unreadUpdates,
  })

  await batch.commit()
}

async function sendText(
  conversationId: string,
  senderId: string,
  otherMemberIds: string[],
  text: string,
) {
  await send({ conversationId, senderId, otherMemberIds, type: 'text', text, previewText: text })
}

async function sendImage(
  conversationId: string,
  senderId: string,
  otherMemberIds: string[],
  imageUrl: string,
  messageId?: string,
) {
  await send({
    conversationId,
    senderId,
    otherMemberIds,
    type: 'image',
    imageUrl,
    previewText: '[圖片]',
    messageId,
  })
}

async function sendSystemNote(
  conversationId: string,
  senderId: string,
  otherMemberIds: string[],
  text: string,
) {
  await send({ conversationId, senderId, otherMemberIds, type: 'system', text, previewText: text })
}

export const chatService = {
  subscribeLatestMessages,
  loadOlderMessages,
  reserveMessageId,
  sendText,
  sendImage,
  sendSystemNote,
}
