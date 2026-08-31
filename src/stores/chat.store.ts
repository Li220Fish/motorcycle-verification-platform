import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Unsubscribe } from 'firebase/firestore'

import { chatService } from '@/services/chat/chat.service'
import { conversationService } from '@/services/chat/conversation.service'
import { storageService } from '@/services/firebase/storage.service'
import type {
  ChatMessage,
  Conversation,
  ConversationContext,
  MemberSnapshot,
} from '@/services/chat/chat.types'

export const useChatStore = defineStore('chat', () => {
  const currentUid = ref<string | null>(null)
  const conversations = ref<Conversation[]>([])
  const conversationsLoaded = ref(false)
  const currentConversation = ref<Conversation | null>(null)
  const messages = ref<ChatMessage[]>([])
  const messagesLoaded = ref(false)
  const sendError = ref('')

  let unsubConversations: Unsubscribe | null = null
  let unsubCurrentConversation: Unsubscribe | null = null
  let unsubMessages: Unsubscribe | null = null

  const unreadTotal = computed(() => {
    const uid = currentUid.value
    if (!uid) return 0
    return conversations.value.reduce((sum, c) => sum + (c.unreadCounts[uid] ?? 0), 0)
  })

  function otherMemberIds(conversation: Conversation): string[] {
    const uid = currentUid.value
    return conversation.memberIds.filter((id) => id !== uid)
  }

  /** Call once per session (e.g. from the messages/home shell) — idempotent per uid. */
  function subscribeConversations(uid: string): void {
    if (unsubConversations && currentUid.value === uid) return
    unsubConversations?.()
    currentUid.value = uid
    conversationsLoaded.value = false
    unsubConversations = conversationService.subscribeConversations(uid, (list) => {
      conversations.value = list
      conversationsLoaded.value = true
    })
  }

  function stopConversationsSubscription(): void {
    unsubConversations?.()
    unsubConversations = null
    conversations.value = []
    conversationsLoaded.value = false
  }

  function openConversation(conversationId: string): void {
    closeConversation()
    messagesLoaded.value = false
    unsubCurrentConversation = conversationService.subscribeConversation(conversationId, (c) => {
      currentConversation.value = c
    })
    unsubMessages = chatService.subscribeLatestMessages(conversationId, (list) => {
      messages.value = list
      messagesLoaded.value = true
    })
  }

  function closeConversation(): void {
    unsubCurrentConversation?.()
    unsubMessages?.()
    unsubCurrentConversation = null
    unsubMessages = null
    currentConversation.value = null
    messages.value = []
    messagesLoaded.value = false
  }

  async function findOrCreateConversation(
    currentSnapshot: MemberSnapshot,
    otherUid: string,
    otherSnapshot: MemberSnapshot,
    context?: ConversationContext,
  ): Promise<string> {
    if (!currentUid.value) throw new Error('not authenticated')
    return conversationService.findOrCreateConversation(
      currentUid.value,
      currentSnapshot,
      otherUid,
      otherSnapshot,
      context,
      context?.listingId ? '買家詢問' : '一般',
    )
  }

  async function sendText(text: string): Promise<void> {
    const conversation = currentConversation.value
    if (!conversation || !currentUid.value || !text.trim()) return
    sendError.value = ''
    try {
      await chatService.sendText(
        conversation.id,
        currentUid.value,
        otherMemberIds(conversation),
        text.trim(),
      )
    } catch (error) {
      sendError.value = error instanceof Error ? error.message : '傳送失敗'
      throw error
    }
  }

  async function sendImageFile(file: Blob): Promise<void> {
    const conversation = currentConversation.value
    if (!conversation || !currentUid.value) return
    sendError.value = ''
    try {
      const messageId = chatService.reserveMessageId(conversation.id)
      const imageUrl = await storageService.uploadChatImage(conversation.id, messageId, file)
      await chatService.sendImage(
        conversation.id,
        currentUid.value,
        otherMemberIds(conversation),
        imageUrl,
        messageId,
      )
    } catch (error) {
      sendError.value = error instanceof Error ? error.message : '圖片上傳失敗'
      throw error
    }
  }

  async function sendVehicle(vehicleId: string, previewText: string): Promise<void> {
    const conversation = currentConversation.value
    if (!conversation || !currentUid.value) return
    await chatService.sendVehicle(
      conversation.id,
      currentUid.value,
      otherMemberIds(conversation),
      vehicleId,
      previewText,
    )
  }

  async function sendVerificationReport(verificationId: string): Promise<void> {
    const conversation = currentConversation.value
    if (!conversation || !currentUid.value) return
    await chatService.sendVerificationReport(
      conversation.id,
      currentUid.value,
      otherMemberIds(conversation),
      verificationId,
    )
  }

  async function markCurrentConversationRead(): Promise<void> {
    const conversation = currentConversation.value
    if (!conversation || !currentUid.value) return
    if ((conversation.unreadCounts[currentUid.value] ?? 0) === 0) return
    await conversationService.markRead(conversation.id, currentUid.value)
  }

  async function setMuted(conversationId: string, muted: boolean): Promise<void> {
    if (!currentUid.value) return
    await conversationService.setMuted(conversationId, currentUid.value, muted)
  }

  async function setArchived(conversationId: string, archived: boolean): Promise<void> {
    if (!currentUid.value) return
    await conversationService.setArchived(conversationId, currentUid.value, archived)
  }

  return {
    conversations,
    conversationsLoaded,
    currentConversation,
    messages,
    messagesLoaded,
    sendError,
    unreadTotal,
    subscribeConversations,
    stopConversationsSubscription,
    openConversation,
    closeConversation,
    findOrCreateConversation,
    sendText,
    sendImageFile,
    sendVehicle,
    sendVerificationReport,
    markCurrentConversationRead,
    setMuted,
    setArchived,
  }
})
