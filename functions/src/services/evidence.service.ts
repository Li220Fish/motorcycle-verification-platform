import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import sharp from 'sharp'
import { itemIdForView, viewForItemId } from './evidence-view-map'

export interface ResolvedImageEvidence {
  evidenceId: string
  itemId: string
  view: string
  base64: string
  mimeType: string
}

export interface ResolvedAudioEvidence {
  evidenceId: string
  itemId: string
  base64: string
  mimeType: string
}

interface RawEvidenceRow {
  id: string
  itemId: string
  type: string
  remoteUrl?: string
  createdAt: number
  metadata?: Record<string, unknown>
}

// Group A/B/C spec's "Image Cost Strategy" — analysis copy only, never
// overwrites the original Evidence stored for the report.
const ANALYSIS_LONG_EDGE = 1280
const ANALYSIS_JPEG_QUALITY = 78

async function downloadObject(objectPath: string): Promise<Buffer> {
  const [buffer] = await getStorage().bucket().file(objectPath).download()
  return buffer
}

async function toAnalysisJpeg(buffer: Buffer): Promise<{ base64: string; mimeType: string }> {
  const resized = await sharp(buffer)
    .resize({
      width: ANALYSIS_LONG_EDGE,
      height: ANALYSIS_LONG_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: ANALYSIS_JPEG_QUALITY })
    .toBuffer()
  return { base64: resized.toString('base64'), mimeType: 'image/jpeg' }
}

async function fetchLatestEvidenceByView(
  verificationId: string,
  wantedViews: readonly string[],
): Promise<Map<string, RawEvidenceRow>> {
  const snap = await getFirestore()
    .collection('verifications')
    .doc(verificationId)
    .collection('evidence')
    .get()

  const byView = new Map<string, RawEvidenceRow>()
  for (const doc of snap.docs) {
    const data = doc.data() as Omit<RawEvidenceRow, 'id'>
    if (data.type !== 'photo' && data.type !== 'document') continue
    const view = viewForItemId(data.itemId)
    if (!view || !wantedViews.includes(view)) continue
    if (!data.remoteUrl) continue
    const existing = byView.get(view)
    if (existing && existing.createdAt >= data.createdAt) continue
    byView.set(view, { id: doc.id, ...data })
  }
  return byView
}

/** First-pass group analysis: every required view must already be captured. */
export async function resolveImageEvidenceForViews(
  verificationId: string,
  requiredViews: readonly string[],
): Promise<ResolvedImageEvidence[]> {
  const byView = await fetchLatestEvidenceByView(verificationId, requiredViews)
  const missing = requiredViews.filter((view) => !byView.has(view))
  if (missing.length > 0) {
    throw new Error(`Missing required evidence views: ${missing.join(', ')}`)
  }

  const resolved: ResolvedImageEvidence[] = []
  for (const view of requiredViews) {
    const row = byView.get(view)!
    const buffer = await downloadObject(row.remoteUrl!)
    const { base64, mimeType } = await toAnalysisJpeg(buffer)
    resolved.push({ evidenceId: row.id, itemId: row.itemId, view, base64, mimeType })
  }
  return resolved
}

export async function resolveAudioEvidence(
  verificationId: string,
  itemId: string,
): Promise<ResolvedAudioEvidence> {
  const snap = await getFirestore()
    .collection('verifications')
    .doc(verificationId)
    .collection('evidence')
    .where('itemId', '==', itemId)
    .where('type', '==', 'audio')
    .get()
  if (snap.empty) {
    throw new Error(`No audio evidence found for item ${itemId}`)
  }
  let latest: RawEvidenceRow | null = null
  for (const doc of snap.docs) {
    const data = doc.data() as Omit<RawEvidenceRow, 'id'>
    if (!data.remoteUrl) continue
    if (!latest || data.createdAt > latest.createdAt) latest = { id: doc.id, ...data }
  }
  if (!latest) throw new Error(`No usable audio evidence for item ${itemId}`)

  const buffer = await downloadObject(latest.remoteUrl!)
  const mimeType = (latest.metadata?.mimeType as string | undefined) ?? 'audio/m4a'
  return {
    evidenceId: latest.id,
    itemId: latest.itemId,
    base64: buffer.toString('base64'),
    mimeType,
  }
}

export interface ResolvedVideoEvidence {
  evidenceId: string
  itemId: string
  buffer: Buffer
  metadata: Record<string, unknown>
}

/** Step 39 (cold-touch) video evidence — unlike resolveImageEvidenceForViews,
 *  this returns the raw video buffer as-is (frame extraction happens
 *  downstream via video/video-tools.ts) plus the Evidence doc's own
 *  `metadata` (the cold-touch contact-window timing). */
export async function resolveVideoEvidence(
  verificationId: string,
  itemId: string,
): Promise<ResolvedVideoEvidence> {
  const snap = await getFirestore()
    .collection('verifications')
    .doc(verificationId)
    .collection('evidence')
    .where('itemId', '==', itemId)
    .where('type', '==', 'video')
    .get()
  if (snap.empty) {
    throw new Error(`No video evidence found for item ${itemId}`)
  }
  let latest: RawEvidenceRow | null = null
  for (const doc of snap.docs) {
    const data = doc.data() as Omit<RawEvidenceRow, 'id'>
    if (!data.remoteUrl) continue
    if (!latest || data.createdAt > latest.createdAt) latest = { id: doc.id, ...data }
  }
  if (!latest) throw new Error(`No usable video evidence for item ${itemId}`)

  const buffer = await downloadObject(latest.remoteUrl!)
  return {
    evidenceId: latest.id,
    itemId: latest.itemId,
    buffer,
    metadata: latest.metadata ?? {},
  }
}

/** Retry variant of resolveVideoEvidence — fetches ONE specific evidence doc
 *  by id (the client's `newEvidenceId`) rather than "whatever is latest",
 *  and rejects it outright if it doesn't actually belong to this
 *  verification. Still used by cold-touch's own retry (that one IS wired to
 *  a real "重新送出 AI 判定" button — see ColdTouchCapture.vue). */
export async function resolveVideoEvidenceById(
  verificationId: string,
  evidenceId: string,
): Promise<ResolvedVideoEvidence> {
  const snap = await getFirestore()
    .collection('verifications')
    .doc(verificationId)
    .collection('evidence')
    .doc(evidenceId)
    .get()
  if (!snap.exists) {
    throw new Error(`Evidence ${evidenceId} does not belong to verification ${verificationId}`)
  }
  const data = snap.data() as Omit<RawEvidenceRow, 'id'>
  if (data.type !== 'video' || !data.remoteUrl) {
    throw new Error(`Evidence ${evidenceId} is not valid video evidence`)
  }
  const buffer = await downloadObject(data.remoteUrl)
  return { evidenceId: snap.id, itemId: data.itemId, buffer, metadata: data.metadata ?? {} }
}

export async function resolveImuEvidence(
  verificationId: string,
  itemId: string,
): Promise<{ evidenceId: string; json: unknown }> {
  const snap = await getFirestore()
    .collection('verifications')
    .doc(verificationId)
    .collection('evidence')
    .where('itemId', '==', itemId)
    .where('type', '==', 'imu')
    .get()
  if (snap.empty) {
    throw new Error(`No IMU evidence found for item ${itemId}`)
  }
  let latest: RawEvidenceRow | null = null
  for (const doc of snap.docs) {
    const data = doc.data() as Omit<RawEvidenceRow, 'id'>
    if (!data.remoteUrl) continue
    if (!latest || data.createdAt > latest.createdAt) latest = { id: doc.id, ...data }
  }
  if (!latest) throw new Error(`No usable IMU evidence for item ${itemId}`)

  const buffer = await downloadObject(latest.remoteUrl!)
  const json = JSON.parse(buffer.toString('utf-8'))
  return { evidenceId: latest.id, json }
}

/** Writes Gemini's free-text engine-type impression (engine-sensor-session
 *  .service.ts's ENGINE TYPE DESCRIPTION result) onto the source audio
 *  Evidence doc's own `metadata.engineType` — not an Answer/aiResult, same
 *  reasoning as dashboard OCR's `metadata.ocr` (ocr.service.ts): this is a
 *  descriptive impression for a human reviewer, not a checklist item with a
 *  pass/fail verdict. */
export async function markEngineTypeOnEvidence(
  verificationId: string,
  evidenceId: string,
  note: string,
): Promise<void> {
  await getFirestore()
    .collection('verifications')
    .doc(verificationId)
    .collection('evidence')
    .doc(evidenceId)
    .set({ metadata: { engineType: { note, analyzedAt: Date.now() } } }, { merge: true })
}

export { itemIdForView }
