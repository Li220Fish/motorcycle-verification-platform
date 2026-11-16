import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { logger } from 'firebase-functions/v2'

import { checkPageUrl, COLLECTIONS, settings, STORAGE_ROOT } from '../config'
import { verifyLiffIdToken, type LineApi } from '../line/line-api'
import { appendMessage } from '../line/store'
import type { AudioInspectionProvider } from '../shared/ai/providers/audio-inspection-provider'
import type { ImuSample } from '../shared/imu/imu-preprocessor'
import { analyzeCheck, CHECK_DURATION_MS, CHECK_PHASES, type CheckResult } from './analyze-check'
import { resultMessage, resultSummaryText } from './result-message'

export interface SubmitCheckBody {
  /** LIFF: liff.getIDToken(). */
  lineIdToken?: string
  audioBase64: string
  audioMimeType: string
  imuSamples: ImuSample[]
  vehicle?: { type?: string; brand?: string; model?: string; year?: string; mileageKm?: number | null }
  symptom?: string
  device?: Record<string, unknown>
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

const MAX_AUDIO_BASE64 = 12 * 1024 * 1024
const MAX_IMU_SAMPLES = 6000

export function validateBody(body: unknown): SubmitCheckBody {
  const value = body as Partial<SubmitCheckBody> | null
  if (!value || typeof value !== 'object') throw new HttpError(400, 'invalid body')
  if (typeof value.audioBase64 !== 'string' || value.audioBase64.length < 1000) {
    throw new HttpError(400, 'audio missing')
  }
  if (value.audioBase64.length > MAX_AUDIO_BASE64) throw new HttpError(413, 'audio too large')
  if (typeof value.audioMimeType !== 'string' || !/^(audio|video)\//.test(value.audioMimeType)) {
    throw new HttpError(400, 'audio type missing')
  }
  const samples = Array.isArray(value.imuSamples) ? value.imuSamples : []
  if (samples.length > MAX_IMU_SAMPLES) throw new HttpError(413, 'too many motion samples')
  const numeric = (sample: ImuSample) =>
    ['tMs', 'ax', 'ay', 'az', 'gx', 'gy', 'gz'].every((key) => Number.isFinite(sample[key as keyof ImuSample]))
  return {
    lineIdToken: typeof value.lineIdToken === 'string' ? value.lineIdToken : undefined,
    audioBase64: value.audioBase64,
    audioMimeType: value.audioMimeType.split(';')[0],
    imuSamples: samples.filter(numeric),
    vehicle: {
      type: String(value.vehicle?.type ?? '').slice(0, 20),
      brand: String(value.vehicle?.brand ?? '').slice(0, 40),
      model: String(value.vehicle?.model ?? '').slice(0, 60),
      year: String(value.vehicle?.year ?? '').slice(0, 10),
      mileageKm: Number.isFinite(Number(value.vehicle?.mileageKm)) ? Number(value.vehicle?.mileageKm) : null,
    },
    symptom: String(value.symptom ?? '').slice(0, 1000),
    device: typeof value.device === 'object' && value.device ? value.device : {},
  }
}

export interface Submitter {
  lineUserId: string | null
  firebaseUid: string | null
  displayName: string | null
}

/** LIFF users are identified by their LINE ID token; the dev web page (no
 *  LINE yet) by a Firebase ID token. */
export async function identify(body: SubmitCheckBody, authorization: string | undefined): Promise<Submitter> {
  const { loginChannelId } = settings()
  if (body.lineIdToken) {
    if (!loginChannelId) throw new HttpError(400, 'LINE Login is not configured on the server')
    try {
      const line = await verifyLiffIdToken(body.lineIdToken, loginChannelId)
      return { lineUserId: line.userId, firebaseUid: null, displayName: line.name }
    } catch {
      throw new HttpError(401, 'LINE login expired, please reopen the page from LINE')
    }
  }
  const match = /^Bearer (.+)$/.exec(authorization ?? '')
  if (!match) throw new HttpError(401, 'not signed in')
  try {
    const decoded = await getAuth().verifyIdToken(match[1])
    return { lineUserId: null, firebaseUid: decoded.uid, displayName: null }
  } catch {
    throw new HttpError(401, 'invalid sign-in')
  }
}

function extensionFor(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm'
  if (mimeType.includes('ogg')) return 'ogg'
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a'
  if (mimeType.includes('wav')) return 'wav'
  return 'aac'
}

export async function submitCheck(params: {
  body: SubmitCheckBody
  submitter: Submitter
  provider: AudioInspectionProvider | null
  apiKey: string
  line: LineApi | null
}): Promise<{ checkId: string; result: Omit<CheckResult, 'research'>; summary: string }> {
  const { body, submitter } = params
  const checkRef = getFirestore().collection(COLLECTIONS.checks).doc()
  const folder = `${STORAGE_ROOT}/checks/${checkRef.id}`
  const audio = Buffer.from(body.audioBase64, 'base64')
  const audioPath = `${folder}/engine.${extensionFor(body.audioMimeType)}`
  const imuPath = `${folder}/imu.json`
  const bucket = getStorage().bucket()
  await Promise.all([
    bucket.file(audioPath).save(audio, { contentType: body.audioMimeType }),
    bucket.file(imuPath).save(
      JSON.stringify({
        schemaVersion: 1,
        sessionType: 'engine-line-hot-v1',
        durationMs: CHECK_DURATION_MS,
        phases: CHECK_PHASES,
        samples: body.imuSamples,
      }),
      { contentType: 'application/json' },
    ),
  ])
  await checkRef.set({
    lineUserId: submitter.lineUserId,
    firebaseUid: submitter.firebaseUid,
    userName: submitter.displayName,
    source: submitter.lineUserId ? 'liff' : 'web',
    vehicle: body.vehicle ?? {},
    symptom: body.symptom ?? '',
    device: body.device ?? {},
    audioPath,
    audioMimeType: body.audioMimeType,
    audioBytes: audio.length,
    imuPath,
    imuSampleCount: body.imuSamples.length,
    status: 'processing',
    result: null,
    researchLabels: [],
    staffNote: '',
    createdAt: FieldValue.serverTimestamp(),
  })

  let result: CheckResult
  try {
    result = await analyzeCheck({
      audio,
      audioMimeType: body.audioMimeType,
      imuSamples: body.imuSamples,
      provider: params.provider,
      apiKey: params.apiKey,
    })
  } catch (error) {
    logger.error('engine-line: analysis failed', { checkId: checkRef.id, error: String(error) })
    await checkRef.update({ status: 'failed', error: String(error).slice(0, 500), finishedAt: FieldValue.serverTimestamp() })
    throw new HttpError(422, '這段錄音無法分析，請確認有錄到引擎聲音後再試一次')
  }

  const { research, ...publicResult } = result
  const summary = resultSummaryText(result)
  await checkRef.update({
    status: 'done',
    result: publicResult,
    research,
    summary,
    finishedAt: FieldValue.serverTimestamp(),
  })

  if (submitter.lineUserId) {
    const userRef = getFirestore().collection(COLLECTIONS.users).doc(submitter.lineUserId)
    await userRef.set(
      {
        lineUserId: submitter.lineUserId,
        ...(submitter.displayName ? { displayName: submitter.displayName } : {}),
        checkCount: FieldValue.increment(1),
        lastCheckId: checkRef.id,
        lastSeenAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
    // Keep a running conversation's history complete for staff.
    const openTicketId = (await userRef.get()).data()?.openTicketId as string | undefined
    if (openTicketId) {
      await appendMessage(openTicketId, {
        from: 'system',
        type: 'check',
        text: `完成一次檢測：${summary.split('\n')[0]}`,
        checkId: checkRef.id,
        delivery: 'n/a',
      })
    }
    if (params.line) {
      try {
        await params.line.push(submitter.lineUserId, [resultMessage(checkRef.id, result, checkPageUrl())])
      } catch (error) {
        logger.warn('engine-line: result push failed', { checkId: checkRef.id, error: String(error) })
      }
    }
  }

  return { checkId: checkRef.id, result: publicResult, summary }
}
