import { getFirestore } from 'firebase-admin/firestore'
import { GEMINI_MODEL } from '../config'
import { callGeminiJson, ImagePart } from '../ai/gemini/client'
import { resolveImageEvidenceForViews } from '../services/evidence.service'

/** OCR output is written onto the source Evidence doc's own `metadata.ocr`
 *  — it isn't an Inspection Item / Answer (routing spec §11: itemId for
 *  dashboard mileage isn't Frozen yet, "不可擅自創造公開 schema 名稱"), and
 *  plate/chassis text is sensitive private-identity data that must never
 *  reach a public Verification/Answer document (spec §12/§21 Privacy). */
async function persistOcrResult(
  verificationId: string,
  evidenceId: string,
  promptVersion: string,
  result: OcrResult,
): Promise<void> {
  await getFirestore()
    .collection('verifications')
    .doc(verificationId)
    .collection('evidence')
    .doc(evidenceId)
    .set(
      { metadata: { ocr: { ...result, promptVersion, analyzedAt: Date.now() } } },
      { merge: true },
    )
}

/**
 * Dashboard/Plate/Chassis OCR routing (Routing Map §11/§12/§21). The spec's
 * preferred shape is "local/device OCR first, Gemini fallback only when
 * needed" — this project has no native on-device OCR pipeline today (that
 * would be its own separate mobile-native undertaking: a Capacitor/ML-Kit
 * plugin, platform-specific builds, etc.), so this v1 pass routes ALL three
 * straight through Gemini vision as the OCR engine, documented here as a
 * deliberate simplification rather than silently pretended-away. Nothing
 * about the routing/schema shape below assumes that; a real local-OCR layer
 * can be slotted in front of this later without changing the contract.
 */
export interface OcrResult {
  text: string | null
  confidence: number | null
  note: string | null
}

const OCR_SCHEMA = {
  type: 'object',
  properties: {
    text: { type: ['string', 'null'] },
    confidence: { type: ['number', 'null'] },
    note: { type: ['string', 'null'] },
  },
  required: ['text', 'confidence', 'note'],
}

async function runOcr(params: {
  apiKey: string
  promptText: string
  promptVersion: string
  image: ImagePart
}): Promise<OcrResult> {
  return callGeminiJson<OcrResult>({
    apiKey: params.apiKey,
    promptText: params.promptText,
    images: [params.image],
    responseSchema: OCR_SCHEMA,
    cacheDiscriminators: [params.promptVersion],
    promptVersion: params.promptVersion,
  })
}

export const DASHBOARD_OCR_PROMPT_VERSION = 'ocr-dashboard-v1'
const DASHBOARD_OCR_PROMPT = `Read the motorcycle instrument cluster (dashboard) photo.

Extract the odometer / mileage reading shown on the display, as digits only (no units).

If the display is unclear, obstructed, unlit, or the reading cannot be read reliably:
set text to null and explain why in note.

Do not guess a plausible-looking number.

Return only the requested JSON shape: { text, confidence, note }.`

export async function analyzeDashboardOcr(params: {
  verificationId: string
  apiKey: string
}): Promise<OcrResult & { evidenceId: string }> {
  const [image] = await resolveImageEvidenceForViews(params.verificationId, ['dashboard'])
  const result = await runOcr({
    apiKey: params.apiKey,
    promptText: DASHBOARD_OCR_PROMPT,
    promptVersion: DASHBOARD_OCR_PROMPT_VERSION,
    image,
  })
  await persistOcrResult(
    params.verificationId,
    image.evidenceId,
    DASHBOARD_OCR_PROMPT_VERSION,
    result,
  )
  return { ...result, evidenceId: image.evidenceId }
}

export const PLATE_OCR_PROMPT_VERSION = 'ocr-plate-v1'
const PLATE_OCR_PROMPT = `Read the motorcycle license plate photo.

Extract the plate characters exactly as shown (letters and digits, no spaces added).

If the plate is unclear, obstructed, or reflective enough that characters cannot be read reliably:
set text to null and explain why in note.

Return only the requested JSON shape: { text, confidence, note }.`

export async function analyzePlateOcr(params: {
  verificationId: string
  apiKey: string
}): Promise<OcrResult & { evidenceId: string }> {
  const [image] = await resolveImageEvidenceForViews(params.verificationId, ['license_plate'])
  const result = await runOcr({
    apiKey: params.apiKey,
    promptText: PLATE_OCR_PROMPT,
    promptVersion: PLATE_OCR_PROMPT_VERSION,
    image,
  })
  await persistOcrResult(params.verificationId, image.evidenceId, PLATE_OCR_PROMPT_VERSION, result)
  return { ...result, evidenceId: image.evidenceId }
}

export const CHASSIS_OCR_PROMPT_VERSION = 'ocr-chassis-v1'
const CHASSIS_OCR_PROMPT = `Read the motorcycle chassis/frame number stamp photo.

Extract the chassis number exactly as stamped (letters and digits, no spaces added).

If the stamp is unclear, obstructed, corroded, or otherwise cannot be read reliably:
set text to null and explain why in note.

Return only the requested JSON shape: { text, confidence, note }.`

export async function analyzeChassisOcr(params: {
  verificationId: string
  apiKey: string
}): Promise<OcrResult & { evidenceId: string }> {
  const [image] = await resolveImageEvidenceForViews(params.verificationId, ['chassis_number'])
  const result = await runOcr({
    apiKey: params.apiKey,
    promptText: CHASSIS_OCR_PROMPT,
    promptVersion: CHASSIS_OCR_PROMPT_VERSION,
    image,
  })
  await persistOcrResult(
    params.verificationId,
    image.evidenceId,
    CHASSIS_OCR_PROMPT_VERSION,
    result,
  )
  return { ...result, evidenceId: image.evidenceId }
}

export const OCR_MODEL = GEMINI_MODEL
