import { defineSecret } from 'firebase-functions/params'

/** Same Firebase project as RiDE (staging), but its own region so the two
 *  codebases' function lists never mix. */
export const REGION = 'asia-east1'

export const LINE_CHANNEL_SECRET = defineSecret('ENGINE_LINE_CHANNEL_SECRET')
export const LINE_ACCESS_TOKEN = defineSecret('ENGINE_LINE_ACCESS_TOKEN')
/** Shared with RiDE — the same Secret Manager entry its analysis functions use. */
export const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY')

/** Placeholder value the secrets hold until the LINE channel exists. */
export const UNSET = 'UNSET'

export function isConfigured(value: string | undefined): value is string {
  return !!value && value.trim() !== '' && value.trim() !== UNSET
}

/** Non-secret settings come from functions/.env. */
export function settings(): { liffId: string; loginChannelId: string; webUrl: string } {
  return {
    liffId: process.env.ENGINE_LINE_LIFF_ID ?? '',
    loginChannelId: process.env.ENGINE_LINE_LOGIN_CHANNEL_ID ?? '',
    webUrl: (process.env.ENGINE_LINE_WEB_URL ?? '').replace(/\/$/, ''),
  }
}

/** Where a LINE user goes to run a check: the LIFF URL once LIFF exists,
 *  otherwise the plain web page (dev mode). */
export function checkPageUrl(): string {
  const { liffId, webUrl } = settings()
  return liffId ? `https://liff.line.me/${liffId}` : `${webUrl}/`
}

export const COLLECTIONS = {
  users: 'engineLineUsers',
  tickets: 'engineLineTickets',
  checks: 'engineLineChecks',
  staff: 'engineLineStaff',
} as const

export const STORAGE_ROOT = 'engineLine'
