import * as crypto from 'node:crypto'

/** LINE Messaging API message objects — only the shapes this bot sends. */
export interface QuickReplyItem {
  type: 'action'
  action:
    | { type: 'message'; label: string; text: string }
    | { type: 'uri'; label: string; uri: string }
    | { type: 'postback'; label: string; data: string; displayText?: string }
}

export interface TextMessage {
  type: 'text'
  text: string
  quickReply?: { items: QuickReplyItem[] }
}

export type LineMessage = TextMessage

export interface LineProfile {
  displayName: string
  pictureUrl?: string
}

/**
 * Everything the bot needs from LINE, behind one interface so the webhook
 * logic runs the same against the real API, the console's simulator, and
 * tests.
 */
export interface LineApi {
  readonly live: boolean
  reply(replyToken: string, messages: LineMessage[]): Promise<void>
  push(to: string, messages: LineMessage[]): Promise<void>
  getProfile(userId: string): Promise<LineProfile | null>
  getContent(messageId: string): Promise<{ buffer: Buffer; contentType: string } | null>
}

/** x-line-signature = base64(HMAC-SHA256(channelSecret, raw body)). */
export function verifySignature(rawBody: Buffer, signature: string | undefined, channelSecret: string): boolean {
  if (!signature) return false
  const expected = crypto.createHmac('sha256', channelSecret).update(rawBody).digest()
  let given: Buffer
  try {
    given = Buffer.from(signature, 'base64')
  } catch {
    return false
  }
  return given.length === expected.length && crypto.timingSafeEqual(given, expected)
}

/** LINE rejects text over 5000 chars. */
export function clampText(text: string): string {
  return text.length > 4900 ? `${text.slice(0, 4900)}…` : text
}

export class HttpLineApi implements LineApi {
  readonly live = true

  constructor(private readonly accessToken: string) {}

  private async call(url: string, body: unknown): Promise<void> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      throw new Error(`LINE API ${response.status}: ${(await response.text()).slice(0, 300)}`)
    }
  }

  async reply(replyToken: string, messages: LineMessage[]): Promise<void> {
    await this.call('https://api.line.me/v2/bot/message/reply', { replyToken, messages: messages.slice(0, 5) })
  }

  async push(to: string, messages: LineMessage[]): Promise<void> {
    await this.call('https://api.line.me/v2/bot/message/push', { to, messages: messages.slice(0, 5) })
  }

  async getProfile(userId: string): Promise<LineProfile | null> {
    const response = await fetch(`https://api.line.me/v2/bot/profile/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    })
    if (!response.ok) return null
    const data = (await response.json()) as LineProfile
    return { displayName: data.displayName, pictureUrl: data.pictureUrl }
  }

  async getContent(messageId: string): Promise<{ buffer: Buffer; contentType: string } | null> {
    const response = await fetch(`https://api-data.line.me/v2/bot/message/${encodeURIComponent(messageId)}/content`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    })
    if (!response.ok) return null
    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get('content-type') ?? 'application/octet-stream',
    }
  }
}

/** Dev mode / simulator: nothing leaves the server, replies are collected. */
export class CapturingLineApi implements LineApi {
  readonly live = false
  readonly sent: Array<{ kind: 'reply' | 'push'; to: string; messages: LineMessage[] }> = []

  async reply(replyToken: string, messages: LineMessage[]): Promise<void> {
    this.sent.push({ kind: 'reply', to: replyToken, messages })
  }

  async push(to: string, messages: LineMessage[]): Promise<void> {
    this.sent.push({ kind: 'push', to, messages })
  }

  async getProfile(): Promise<LineProfile | null> {
    return null
  }

  async getContent(): Promise<{ buffer: Buffer; contentType: string } | null> {
    return null
  }
}

/**
 * Verifies a LIFF ID token with LINE Login and returns the LINE user id.
 * https://developers.line.biz/en/reference/line-login/#verify-id-token
 */
export async function verifyLiffIdToken(
  idToken: string,
  loginChannelId: string,
): Promise<{ userId: string; name: string | null; picture: string | null }> {
  const response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ id_token: idToken, client_id: loginChannelId }).toString(),
  })
  if (!response.ok) throw new Error(`LINE ID token rejected (${response.status})`)
  const data = (await response.json()) as { sub: string; name?: string; picture?: string }
  return { userId: data.sub, name: data.name ?? null, picture: data.picture ?? null }
}
