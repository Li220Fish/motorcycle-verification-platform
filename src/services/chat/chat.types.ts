export type ConversationTag = '一般' | '買家詢問' | '交易中' | '系統'

export interface MemberSnapshot {
  displayName: string
}

export interface ConversationContext {
  vehicleId?: string
  listingId?: string
  verificationId?: string
}

export interface ConversationLastMessage {
  type: MessageType
  text: string
  senderId: string
  createdAt: number
}

/**
 * Read receipts live on the Conversation doc (lastReadAtBy), not per-message
 * readBy arrays — updating every message on every read would be far more
 * writes than a two-person chat needs. unreadCounts is the badge source of
 * truth; lastReadAtBy answers "did the other person see my last message".
 */
export interface Conversation {
  id: string
  memberIds: string[]
  memberSnapshots: Record<string, MemberSnapshot>
  context?: ConversationContext
  tag: ConversationTag
  lastMessage: ConversationLastMessage | null
  lastMessageAt: number
  unreadCounts: Record<string, number>
  lastReadAtBy: Record<string, number>
  mutedBy: string[]
  archivedBy: string[]
  createdAt: number
  updatedAt: number
}

export type MessageType = 'text' | 'image' | 'vehicle' | 'verification_report' | 'system'

export interface ChatMessage {
  id: string
  senderId: string
  type: MessageType
  text?: string
  imageUrl?: string
  vehicleId?: string
  verificationId?: string
  createdAt: number
}
