import { defineStore } from 'pinia'
import { ref } from 'vue'

import { lt } from '@/i18n/locale-text'
import {
  aiChatService,
  type AiChatImageDto,
  type AiChatTurnDto,
} from '@/services/firebase/ai-chat.service'

export interface AiChatMessage {
  id: number
  role: 'user' | 'model'
  text: string
  /** Local preview of the photo sent with this message, if any. */
  imageUrl?: string
  /** Kept so later turns can resend the conversation (the backend is stateless). */
  image?: AiChatImageDto
  error?: boolean
}

export interface PendingAiImage {
  image: AiChatImageDto
  previewUrl: string
}

/**
 * 買家複驗的 AI 詢問小視窗 — session-only conversation state (never saved),
 * shared so any capture screen can open the chat with a just-taken photo
 * attached (askAboutPhoto / askAboutEvidencePhoto) instead of the user
 * re-picking it.
 */
export const useAiChatStore = defineStore('ai-chat', () => {
  const open = ref(false)
  const messages = ref<AiChatMessage[]>([])
  const sending = ref(false)
  const pendingImage = ref<PendingAiImage | null>(null)
  const preparingImage = ref(false)
  let nextId = 1

  async function attachImage(source: Blob): Promise<void> {
    preparingImage.value = true
    try {
      const { base64, mimeType, previewUrl } = await aiChatService.prepareImage(source)
      pendingImage.value = { image: { base64, mimeType }, previewUrl }
    } finally {
      preparingImage.value = false
    }
  }

  function clearImage(): void {
    pendingImage.value = null
  }

  /** Opens the chat with this photo ready to send — the user just adds a question. */
  async function askAboutPhoto(source: Blob): Promise<void> {
    open.value = true
    await attachImage(source)
  }

  /** Same, for a check photo that's already uploaded as verification evidence. */
  function askAboutEvidencePhoto(storagePath: string, previewUrl: string): void {
    open.value = true
    pendingImage.value = { image: { storagePath }, previewUrl }
  }

  async function send(text: string): Promise<void> {
    const trimmed = text.trim()
    const pending = pendingImage.value
    if (sending.value || (!trimmed && !pending)) return
    messages.value.push({
      id: nextId++,
      role: 'user',
      text: trimmed,
      imageUrl: pending?.previewUrl,
      image: pending?.image,
    })
    pendingImage.value = null
    sending.value = true
    try {
      const turns: AiChatTurnDto[] = messages.value
        .filter((m) => !m.error)
        .map((m) => ({ role: m.role, text: m.text, ...(m.image ? { image: m.image } : {}) }))
      const reply = await aiChatService.ask(turns)
      messages.value.push({ id: nextId++, role: 'model', text: reply })
    } catch (error) {
      console.error('[ai-chat] ask failed:', error)
      messages.value.push({
        id: nextId++,
        role: 'model',
        text: lt(
          'AI 暫時無法回覆，請稍後再試一次。',
          'The AI could not answer right now — please try again.',
        ),
        error: true,
      })
    } finally {
      sending.value = false
    }
  }

  function reset(): void {
    messages.value = []
    pendingImage.value = null
    open.value = false
  }

  return {
    open,
    messages,
    sending,
    pendingImage,
    preparingImage,
    attachImage,
    clearImage,
    askAboutPhoto,
    askAboutEvidencePhoto,
    send,
    reset,
  }
})
