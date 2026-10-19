import { httpsCallable } from 'firebase/functions'

import { functions } from './firebase'
import { imageCompressionService } from '@/services/media/image-compression.service'

/** One turn as sent to askAiAssistant (functions/src/functions/ask-ai-assistant.ts). */
export type AiChatImageDto = { base64: string; mimeType: string } | { storagePath: string }

export interface AiChatTurnDto {
  role: 'user' | 'model'
  text: string
  /** Inline photo, or an evidence photo already uploaded to Storage (the
   *  server reads it after checking the caller owns that verification). */
  image?: AiChatImageDto
}

async function ask(turns: AiChatTurnDto[]): Promise<string> {
  const call = httpsCallable<{ turns: AiChatTurnDto[] }, { text: string }>(
    functions,
    'askAiAssistant',
  )
  const response = await call({ turns })
  return response.data.text
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'))
    reader.readAsDataURL(blob)
  })
}

/** Downscales a photo (same 1600px/JPEG pipeline as evidence uploads) and
 *  returns it ready to send plus a local preview URL. */
async function prepareImage(source: Blob): Promise<{
  base64: string
  mimeType: string
  previewUrl: string
}> {
  const { blob } = await imageCompressionService.compressImage(source)
  return {
    base64: await blobToBase64(blob),
    mimeType: blob.type || 'image/jpeg',
    previewUrl: URL.createObjectURL(blob),
  }
}

export const aiChatService = { ask, prepareImage }
