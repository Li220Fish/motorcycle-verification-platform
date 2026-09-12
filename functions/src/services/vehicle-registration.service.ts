import { getFirestore } from 'firebase-admin/firestore'
import sharp from 'sharp'
import { callGeminiJson, ImagePart } from '../ai/gemini/client'
import { REGISTRATION_OCR_PROMPT_VERSION } from '../ai/prompts/registration-ocr-v1'
import { resolvePromptText, hashPromptText } from './prompt-config.service'

// Same Image Cost Strategy constants as evidence.service.ts's toAnalysisJpeg
// — analysis copy only, the original upload in Storage is left untouched.
const ANALYSIS_LONG_EDGE = 1280
const ANALYSIS_JPEG_QUALITY = 78

async function fetchAndResize(url: string): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download registration document image: ${response.status}`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
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

const REGISTRATION_OCR_SCHEMA = {
  type: 'object',
  properties: {
    engineNumber: { type: ['string', 'null'] },
    confidence: { type: ['number', 'null'] },
    note: { type: ['string', 'null'] },
  },
  required: ['engineNumber', 'confidence', 'note'],
}

interface RegistrationOcrResult {
  engineNumber: string | null
  confidence: number | null
  note: string | null
}

export interface VehicleRegistrationVerification {
  status: 'passed'
  ocrEngineNumber: string | null
  confidence: number | null
  note: string | null
  verifiedAt: number
}

/**
 * 行照驗證 — 2026-09 簡化：使用者只需上傳行照照片，不再輸入任何文字。
 * Gemini 仍會實際 OCR 讀取引擎號碼供畫面顯示，但通過與否不取決於 OCR
 * 結果——只要有上傳照片就一律視為通過（原本「輸入 test 跳過 OCR」的
 * QA/demo 後門已隨文字輸入框一起移除，這個「上傳任意照片即通過」的行為
 * 本身就取代了它）。車身號碼不再由這支流程判斷；Vehicle.chassisNumber
 * 仍是獨立欄位，可在 VehicleDetailView.vue 手動編輯。Written via Admin SDK
 * only — firestore.rules blocks the client from ever setting
 * `registrationVerification` directly (see the vehicles/{id} update rule).
 */
export async function verifyVehicleRegistration(params: {
  vehicleId: string
  apiKey: string
  documentUrl: string
}): Promise<VehicleRegistrationVerification> {
  const vehicleRef = getFirestore().collection('vehicles').doc(params.vehicleId)

  const { base64, mimeType } = await fetchAndResize(params.documentUrl)
  const image: ImagePart = {
    evidenceId: params.vehicleId,
    view: 'registration_document',
    base64,
    mimeType,
  }
  const promptText = await resolvePromptText('registration-ocr-v1')
  const result = await callGeminiJson<RegistrationOcrResult>({
    apiKey: params.apiKey,
    promptText,
    images: [image],
    responseSchema: REGISTRATION_OCR_SCHEMA,
    cacheDiscriminators: [
      REGISTRATION_OCR_PROMPT_VERSION,
      params.vehicleId,
      hashPromptText(promptText),
    ],
    promptVersion: REGISTRATION_OCR_PROMPT_VERSION,
  })

  const registrationVerification: VehicleRegistrationVerification = {
    status: 'passed',
    ocrEngineNumber: result.engineNumber,
    confidence: result.confidence,
    note: result.note,
    verifiedAt: Date.now(),
  }
  const update: Record<string, unknown> = {
    registrationVerification,
    registrationDocumentUrl: params.documentUrl,
  }
  // OCR is treated as the authoritative source for this field once it finds
  // one — same reasoning as PREP-03/ENG-02 elsewhere: the physical document
  // beats a manually-typed value. Only written when actually found, since a
  // failed read no longer blocks verification and shouldn't clobber an
  // existing value with null.
  if (result.engineNumber) {
    update.engineNumber = result.engineNumber
  }
  await vehicleRef.set(update, { merge: true })
  return registrationVerification
}
