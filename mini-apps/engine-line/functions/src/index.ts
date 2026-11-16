/**
 * 引擎檢測 LINE Bot — Cloud Functions codebase "engineline".
 * Deployed on its own (mini-apps/engine-line/firebase.json); shares only the
 * Firebase project and the GEMINI_API_KEY secret with RiDE.
 */
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions/v2'

import { HttpError, identify, submitCheck, validateBody } from './checks/submit-check'
import { GEMINI_API_KEY, isConfigured, LINE_ACCESS_TOKEN, LINE_CHANNEL_SECRET, REGION } from './config'
import { handleLineEvent, type LineEvent } from './line/handle-event'
import { CapturingLineApi, HttpLineApi, verifySignature, type LineApi } from './line/line-api'
import { GeminiAudioInspectionProvider } from './shared/ai/providers/audio-inspection-provider'
import { deliverStaffMessage, isStaff } from './staff/staff'

initializeApp()
getFirestore().settings({ ignoreUndefinedProperties: true })

function liveLine(): LineApi | null {
  const token = LINE_ACCESS_TOKEN.value()
  return isConfigured(token) ? new HttpLineApi(token) : null
}

/** LINE Messaging API webhook (set as the channel's Webhook URL). */
export const lineWebhook = onRequest(
  { region: REGION, secrets: [LINE_CHANNEL_SECRET, LINE_ACCESS_TOKEN], memory: '256MiB' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(200).send('engine-line webhook')
      return
    }
    const secret = LINE_CHANNEL_SECRET.value()
    const line = liveLine()
    if (!isConfigured(secret) || !line) {
      logger.info('engine-line: webhook hit while LINE is not configured (dev mode)')
      res.status(200).send('dev mode')
      return
    }
    if (!verifySignature(req.rawBody, req.header('x-line-signature'), secret)) {
      res.status(401).send('bad signature')
      return
    }
    const events = ((req.body as { events?: LineEvent[] })?.events ?? []) as LineEvent[]
    // LINE's "Verify" button sends an empty event list.
    for (const event of events) {
      try {
        await handleLineEvent(event, line)
      } catch (error) {
        logger.error('engine-line: event failed', { type: event.type, error: String(error) })
      }
    }
    res.status(200).send('ok')
  },
)

/** LIFF / web check page → store + analyze + push the result to LINE. */
export const submitEngineCheck = onRequest(
  {
    region: REGION,
    secrets: [GEMINI_API_KEY, LINE_ACCESS_TOKEN],
    memory: '1GiB',
    timeoutSeconds: 120,
    cors: true,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'POST only' })
      return
    }
    try {
      const body = validateBody(req.body)
      const submitter = await identify(body, req.header('authorization'))
      const apiKey = GEMINI_API_KEY.value()
      const outcome = await submitCheck({
        body,
        submitter,
        provider: isConfigured(apiKey) ? new GeminiAudioInspectionProvider() : null,
        apiKey,
        line: liveLine(),
      })
      res.status(200).json(outcome)
    } catch (error) {
      if (error instanceof HttpError) {
        res.status(error.status).json({ error: error.message })
        return
      }
      logger.error('engine-line: submit failed', { error: String(error) })
      res.status(500).json({ error: '伺服器暫時無法處理，請稍後再試' })
    }
  },
)

/** Console reply → LINE push. */
export const onStaffMessageCreated = onDocumentCreated(
  { document: 'engineLineTickets/{ticketId}/messages/{messageId}', region: REGION, secrets: [LINE_ACCESS_TOKEN] },
  async (event) => {
    const data = event.data?.data()
    if (!data) return
    const delivery = await deliverStaffMessage({
      ticketId: event.params.ticketId,
      messageId: event.params.messageId,
      message: data,
      line: liveLine(),
    })
    if (delivery === 'failed') logger.warn('engine-line: staff reply not delivered', event.params)
  },
)

/**
 * Console's LINE simulator: runs one fake event as user `sim-<staffUid>`
 * through the real bot logic and returns what the bot would have replied.
 * Works with or without a LINE channel.
 */
export const simulateLineEvent = onCall({ region: REGION }, async (request) => {
  const uid = request.auth?.uid
  if (!(await isStaff(uid))) throw new HttpsError('permission-denied', 'staff only')
  const input = request.data as { type?: string; text?: string; postback?: string }
  const lineUserId = `sim-${uid}`
  const event: LineEvent = {
    type: input.type === 'follow' ? 'follow' : input.postback ? 'postback' : 'message',
    replyToken: 'simulated',
    source: { type: 'user', userId: lineUserId },
    ...(input.postback
      ? { postback: { data: String(input.postback) } }
      : { message: { id: `sim-${Date.now()}`, type: 'text', text: String(input.text ?? '').slice(0, 1000) } }),
  }
  const capture = new CapturingLineApi()
  await handleLineEvent(event, capture)
  return { lineUserId, sent: capture.sent }
})
