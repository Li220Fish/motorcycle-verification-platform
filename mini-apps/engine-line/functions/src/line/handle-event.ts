import { getFirestore } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'

import { checkPageUrl, COLLECTIONS } from '../config'
import type { LineApi } from './line-api'
import { BOT_TEXT, parseIntent, RESULT_ICON, RESULT_LABEL } from './messages'
import { appendMessage, closeTicket, openTicket, saveTicketMedia, touchUser, type MessageType } from './store'

/** The subset of LINE webhook events this bot reacts to. */
export interface LineEvent {
  type: string
  replyToken?: string
  source?: { type: string; userId?: string }
  message?: { id: string; type: string; text?: string; fileName?: string }
  postback?: { data: string }
}

const MEDIA_TYPES: Record<string, MessageType> = { image: 'image', audio: 'audio', video: 'video', file: 'file' }

async function historyLines(lineUserId: string): Promise<string[]> {
  const snapshot = await getFirestore()
    .collection(COLLECTIONS.checks)
    .where('lineUserId', '==', lineUserId)
    .limit(30)
    .get()
  return snapshot.docs
    .map((doc) => doc.data())
    .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
    .slice(0, 3)
    .map((check) => {
      const date = check.createdAt?.toDate?.()
      const when = date
        ? date.toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric' })
        : ''
      const overall = check.result?.overall as string | undefined
      return overall
        ? `${when} ${RESULT_ICON[overall] ?? ''} ${RESULT_LABEL[overall] ?? overall}`
        : `${when} ${check.status === 'failed' ? '分析失敗' : '分析中'}`
    })
}

/**
 * One webhook event → Firestore + replies. Shared by the real webhook and the
 * console's dev simulator (which passes a CapturingLineApi).
 */
export async function handleLineEvent(event: LineEvent, line: LineApi): Promise<void> {
  const lineUserId = event.source?.userId
  if (!lineUserId) return
  const checkUrl = checkPageUrl()
  const reply = async (messages: Parameters<LineApi['reply']>[1]) => {
    if (event.replyToken) await line.reply(event.replyToken, messages)
  }

  if (event.type === 'unfollow') {
    await touchUser(lineUserId, async () => null, { followed: false })
    return
  }

  const user = await touchUser(lineUserId, () => line.getProfile(lineUserId), { followed: true })

  if (event.type === 'follow') {
    await reply([BOT_TEXT.welcome(user.displayName, checkUrl)])
    return
  }

  if (event.type === 'postback' && event.postback) {
    const params = new URLSearchParams(event.postback.data)
    if (params.get('action') === 'followup') {
      const checkId = params.get('checkId')
      const { ticketId } = await openTicket({
        lineUserId,
        displayName: user.displayName,
        category: 'check_followup',
        checkId,
      })
      await appendMessage(ticketId, {
        from: 'system',
        type: 'check',
        text: '使用者對這次檢測結果有疑問',
        checkId,
        delivery: 'n/a',
      })
      await reply([BOT_TEXT.ticketOpened('human')])
    }
    return
  }

  if (event.type !== 'message' || !event.message) return
  const message = event.message

  if (message.type === 'text') {
    const body = message.text ?? ''
    const intent = parseIntent(body)
    switch (intent) {
      case 'check':
        await reply([BOT_TEXT.check(checkUrl)])
        return
      case 'report':
      case 'human': {
        const { ticketId, created } = await openTicket({ lineUserId, displayName: user.displayName, category: intent })
        await appendMessage(ticketId, {
          from: 'system',
          type: 'text',
          text: intent === 'human' ? '使用者要求真人服務' : created ? '使用者開始回報問題' : '使用者再次要求回報',
          delivery: 'n/a',
        })
        await reply([BOT_TEXT.ticketOpened(intent)])
        return
      }
      case 'close': {
        const closed = await closeTicket(lineUserId)
        if (closed) {
          await appendMessage(closed, { from: 'system', type: 'text', text: '使用者結束對話', delivery: 'n/a' })
          await reply([BOT_TEXT.ticketClosed(checkUrl)])
        } else {
          await reply([BOT_TEXT.noTicket(checkUrl)])
        }
        return
      }
      case 'history':
        await reply([BOT_TEXT.history(await historyLines(lineUserId), checkUrl)])
        return
      case 'help':
        await reply([BOT_TEXT.help(checkUrl)])
        return
      case 'none':
        if (user.openTicketId) {
          await appendMessage(user.openTicketId, { from: 'user', type: 'text', text: body, delivery: 'n/a' })
          // Only acknowledge the first message after the bot's own prompt, not
          // every line of a conversation with a human.
          return
        }
        await reply([BOT_TEXT.help(checkUrl)])
        return
    }
  }

  const mediaType = MEDIA_TYPES[message.type]
  if (mediaType) {
    // Media without an open ticket starts a report — someone sending a
    // recording of their engine is almost always reporting a problem.
    const { ticketId } = await openTicket({ lineUserId, displayName: user.displayName, category: 'report' })
    let mediaPath: string | null = null
    let contentType: string | null = null
    try {
      const content = await line.getContent(message.id)
      if (content) {
        mediaPath = await saveTicketMedia(ticketId, message.id, content)
        contentType = content.contentType
      }
    } catch (error) {
      logger.warn('engine-line: media download failed', { messageId: message.id, error: String(error) })
    }
    await appendMessage(ticketId, {
      from: 'user',
      type: mediaType,
      text: message.fileName ?? null,
      mediaPath,
      contentType,
      delivery: 'n/a',
    })
    await reply([BOT_TEXT.mediaSaved()])
    return
  }

  // Stickers, locations, … — nothing to do but show the menu.
  if (!user.openTicketId) await reply([BOT_TEXT.help(checkUrl)])
}
