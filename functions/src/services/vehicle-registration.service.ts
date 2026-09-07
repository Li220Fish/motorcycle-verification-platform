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
    chassisNumber: { type: ['string', 'null'] },
    confidence: { type: ['number', 'null'] },
    note: { type: ['string', 'null'] },
  },
  required: ['engineNumber', 'chassisNumber', 'confidence', 'note'],
}

interface RegistrationOcrResult {
  engineNumber: string | null
  chassisNumber: string | null
  confidence: number | null
  note: string | null
}

export type RegistrationVerificationStatus = 'passed' | 'attention'

export interface VehicleRegistrationVerification {
  status: RegistrationVerificationStatus
  method: 'ocr' | 'test-bypass'
  inputNumber: string | null
  ocrEngineNumber: string | null
  ocrChassisNumber: string | null
  confidence: number | null
  note: string | null
  verifiedAt: number
}

/**
 * Typing "test" (case-insensitive) into the 行照號碼 field is a deliberate
 * QA/demo bypass — no real 行照 document is required, nothing is sent to
 * Gemini. Every other input requires an uploaded document photo and goes
 * through Gemini OCR, matching ocr.service.ts's "extract exactly what's
 * printed, never guess a plausible value" discipline. Written via Admin SDK
 * only — firestore.rules blocks the client from ever setting
 * `registrationVerification` directly (see the vehicles/{id} update rule).
 */
export async function verifyVehicleRegistration(params: {
  vehicleId: string
  apiKey: string
  registrationNumberInput: string
  documentUrl?: string
}): Promise<VehicleRegistrationVerification> {
  const trimmed = params.registrationNumberInput.trim()
  const vehicleRef = getFirestore().collection('vehicles').doc(params.vehicleId)

  if (trimmed.toLowerCase() === 'test') {
    const registrationVerification: VehicleRegistrationVerification = {
      status: 'passed',
      method: 'test-bypass',
      inputNumber: trimmed,
      ocrEngineNumber: null,
      ocrChassisNumber: null,
      confidence: null,
      note: '測試模式：輸入 test 已跳過 OCR 檢查',
      verifiedAt: Date.now(),
    }
    await vehicleRef.set({ registrationVerification }, { merge: true })
    return registrationVerification
  }

  if (!params.documentUrl) {
    throw new Error('documentUrl is required unless registrationNumberInput is "test"')
  }

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

  const passed = Boolean(result.engineNumber) && Boolean(result.chassisNumber)
  const registrationVerification: VehicleRegistrationVerification = {
    status: passed ? 'passed' : 'attention',
    method: 'ocr',
    inputNumber: trimmed,
    ocrEngineNumber: result.engineNumber,
    ocrChassisNumber: result.chassisNumber,
    confidence: result.confidence,
    note: result.note,
    verifiedAt: Date.now(),
  }
  // OCR is treated as the authoritative source for these two fields once it
  // succeeds — same reasoning as PREP-03/ENG-02 elsewhere: the physical
  // document beats a manually-typed value.
  const update: Record<string, unknown> = {
    registrationVerification,
    registrationDocumentUrl: params.documentUrl,
  }
  if (passed) {
    update.engineNumber = result.engineNumber
    update.chassisNumber = result.chassisNumber
  }
  await vehicleRef.set(update, { merge: true })
  return registrationVerification
}
