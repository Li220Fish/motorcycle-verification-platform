import { randomUUID } from 'node:crypto'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import sharp from 'sharp'
import { callGeminiJson, ImagePart } from '../ai/gemini/client'
import { REGISTRATION_OCR_GEMINI_V3_PROMPT_VERSION } from '../ai/prompts/registration-ocr-gemini-v3'
import { resolvePromptText, hashPromptText } from './prompt-config.service'
import { scanRegistrationDocument } from './registration-ocr.service'

/** v2 (2026-10): calibrated back toward Gemini's own confidence scale now
 *  that Gemini is the PRIMARY engine (reading the masked image — see
 *  runGeminiOcr() below), not a last-resort fallback. The local Tesseract
 *  pipeline only ever decides the result now when the Gemini call itself
 *  errors (quota/network) — rare enough that it's fine for this threshold to
 *  occasionally be stricter than Tesseract's own scores run (confirmed in
 *  projectTest/registration_ocr.py: correct local reads often scored
 *  0.25-0.45) — a slightly-too-strict rejection on an already-rare failure
 *  path just means "retake the photo", not a broken feature. */
const MIN_PASS_CONFIDENCE = 0.3

// Same Image Cost Strategy constants as evidence.service.ts's toAnalysisJpeg.
const ANALYSIS_LONG_EDGE = 1280
const ANALYSIS_JPEG_QUALITY = 78

interface RegistrationOcrResult {
  engineNumber: string | null
  confidence: number | null
  note: string | null
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

export type VehicleRegistrationVerificationStatus = 'passed' | 'failed'

/** Which engine actually produced this result — surfaced in Firestore (and
 *  from there, the admin 行照照片/車輛詳情 pages) so it's visible whenever
 *  the Gemini fallback below actually fired, not just inferred from the
 *  confidence number. */
export type VehicleRegistrationOcrMethod = 'local' | 'gemini'

export interface VehicleRegistrationVerification {
  status: VehicleRegistrationVerificationStatus
  ocrEngineNumber: string | null
  confidence: number | null
  note: string | null
  verifiedAt: number
  method: VehicleRegistrationOcrMethod
}

async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download registration document image: ${response.status}`)
  }
  return Buffer.from(await response.arrayBuffer())
}

/** Only reached when scan is non-null — see verifyVehicleRegistration: a
 *  null scan is rejected outright before any OCR engine runs at all. */
function fromLocalFields(
  scan: NonNullable<Awaited<ReturnType<typeof scanRegistrationDocument>>>,
): RegistrationOcrResult {
  return {
    engineNumber: scan.fields.engineNumber.text,
    confidence: scan.fields.engineNumber.confidence,
    note: null,
  }
}

/**
 * Admin SDK equivalent of the client SDK's uploadBytes()+getDownloadURL() —
 * same URL shape (a `firebaseStorageDownloadTokens` capability token, not an
 * auth check), so the admin backend's <img> tags work identically to how
 * they already load `registrationDocumentUrl` (uploaded client-side via
 * storage.service.ts's uploadFileAtPath). Admin SDK writes bypass
 * storage.rules entirely either way; this is purely about producing a URL
 * the browser can actually load without a signed-URL expiry to manage.
 */
async function uploadPublicFile(
  objectPath: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const bucket = getStorage().bucket()
  const file = bucket.file(objectPath)
  const token = randomUUID()
  await file.save(buffer, {
    contentType,
    metadata: { metadata: { firebaseStorageDownloadTokens: token } },
  })
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`
}

/**
 * `maskedImageBuffer` here is ALWAYS renderMaskedImage()'s output (see
 * registration-ocr.service.ts) — now just the engineNumber row, everything
 * else already painted over before this function is ever called. Never pass
 * the original photo buffer here; that would defeat the entire point of
 * masking first.
 */
async function runGeminiOcr(params: {
  vehicleId: string
  apiKey: string
  maskedImageBuffer: Buffer
}): Promise<RegistrationOcrResult> {
  const resized = await sharp(params.maskedImageBuffer)
    .resize({
      width: ANALYSIS_LONG_EDGE,
      height: ANALYSIS_LONG_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: ANALYSIS_JPEG_QUALITY })
    .toBuffer()
  const image: ImagePart = {
    evidenceId: params.vehicleId,
    view: 'registration_document_masked',
    base64: resized.toString('base64'),
    mimeType: 'image/jpeg',
  }
  const promptText = await resolvePromptText('registration-ocr-gemini-v3')
  return callGeminiJson<RegistrationOcrResult>({
    apiKey: params.apiKey,
    promptText,
    images: [image],
    responseSchema: REGISTRATION_OCR_SCHEMA,
    cacheDiscriminators: [
      REGISTRATION_OCR_GEMINI_V3_PROMPT_VERSION,
      params.vehicleId,
      hashPromptText(promptText),
    ],
    promptVersion: REGISTRATION_OCR_GEMINI_V3_PROMPT_VERSION,
  })
}

interface RegistrationOcrScan {
  passed: boolean
  engineNumber: string | null
  confidence: number | null
  note: string | null
  method: VehicleRegistrationOcrMethod
  maskedDocumentUrl: string | null
}

/** The actual scan+OCR pipeline, pulled out of verifyVehicleRegistration so
 *  redeemVehicleTransferInvite (functions/src/functions/vehicle-transfer-
 *  invite.ts) can run the same pass/fail judgment on a would-be transfer
 *  recipient's photo WITHOUT that function's unconditional Firestore write —
 *  a failed or mismatched transfer attempt must never clobber the current
 *  owner's own valid registrationVerification. Callers that DO want the
 *  write (the owner's own re-verify flow) go through verifyVehicleRegistration
 *  below, which calls this and then persists the result unconditionally,
 *  exactly as before this was split out. */
async function scanRegistration(params: {
  vehicleId: string
  documentUrl: string
  apiKey: string
}): Promise<RegistrationOcrScan> {
  let imageBuffer: Buffer
  let localScan: Awaited<ReturnType<typeof scanRegistrationDocument>>
  try {
    imageBuffer = await downloadImage(params.documentUrl)
    localScan = await scanRegistrationDocument(imageBuffer)
  } catch (error) {
    console.error('[vehicle-registration] local scan pipeline crashed:', error)
    return {
      passed: false,
      engineNumber: null,
      confidence: null,
      note: '系統處理照片時發生錯誤，請重新拍攝並上傳。',
      method: 'local',
      maskedDocumentUrl: null,
    }
  }

  let result: RegistrationOcrResult
  let method: VehicleRegistrationOcrMethod = 'local'
  let maskedDocumentUrl: string | null = null
  const isRegistrationDocument = localScan.isRegistrationDocument

  if (!isRegistrationDocument) {
    // The local label template-match didn't recognize it as a 行照 —
    // nothing to mask, nothing to send anywhere.
    result = { engineNumber: null, confidence: null, note: null }
  } else {
    try {
      maskedDocumentUrl = await uploadPublicFile(
        `vehicles/${params.vehicleId}/registration/${Date.now()}-masked.jpg`,
        localScan.maskedImageBuffer,
        'image/jpeg',
      )
    } catch (error) {
      console.error('[vehicle-registration] failed to upload masked preview:', error)
    }

    try {
      result = await runGeminiOcr({
        vehicleId: params.vehicleId,
        apiKey: params.apiKey,
        maskedImageBuffer: localScan.maskedImageBuffer,
      })
      method = 'gemini'
    } catch (error) {
      // Gemini itself erroring (quota/network/etc) shouldn't take down the
      // whole verification — fall through to the local Tesseract read.
      console.error('[vehicle-registration] Gemini OCR failed, falling back to local:', error)
      result = fromLocalFields(localScan)
      method = 'local'
    }
  }

  const confidenceOk = (result.confidence ?? 0) >= MIN_PASS_CONFIDENCE
  const passed = isRegistrationDocument && !!result.engineNumber && confidenceOk

  const fallbackNote = !passed
    ? (result.note ??
      (!isRegistrationDocument
        ? '上傳的照片看起來不是行照，請重新上傳行照照片。'
        : '行照辨識信心度不足或無法讀取引擎號碼，請重新上傳更清晰的照片。'))
    : result.note

  return {
    passed,
    engineNumber: result.engineNumber,
    confidence: result.confidence,
    note: fallbackNote,
    method,
    maskedDocumentUrl,
  }
}


/**
 * 行照驗證 — real pass/fail, not a rubber stamp (see this function's own
 * history for why that distinction matters: until 2026-10, ANY uploaded
 * photo was accepted regardless of what was found on it).
 *
 * 2026-10 v3: scaled down to ONLY engineNumber — plateNumber/chassisNumber/
 * color/displacement/manufactureDate (added, then dropped, earlier this same
 * day) made the guided-camera overlay too fiddly to actually align (6
 * separate boxes), and only engineNumber is actually required for pass/fail.
 * Flow:
 *   1. 直接解碼使用者拍的照片，不做角點偵測/透視校正（2026-10 起移除）——
 *      RegistrationDocumentCapture.vue 的拍照引導框已經把文件裁成固定比例
 *      了，角點偵測是為了修正「任意角度/裁切」的舊自由上傳流程設計的；對
 *      已經貼齊引導框、幾乎滿版的照片再做一次輪廓偵測，實測反而更容易抓歪
 *      （背景所剩無幾，找不到夠好的對比邊緣），會把引導框好不容易對準的位
 *      置又重新弄偏——直接信任拍照當下的裁切，整張原始照片（含車主/地址等
 *      個資）就此留在自己的後端，從未送給任何第三方。
 *   2. isRegistrationDocument 是本機判斷（registration-document-template
 *      .service.ts）——古典 OpenCV 樣板比對，拿行照共同印刷的「引號/擎碼」
 *      標籤跟拍到的照片比對，純離線、不用任何 API、不用任何訓練資料。只有
 *      通過這一步才會真的去呼叫 Gemini，確保「這是不是行照」這個判斷完全
 *      不依賴網路或第三方。
 *   3. 用上一步產生的「遮罩後」圖（只露出引擎號碼那一列，其餘全部塗掉）送
 *      給 Gemini 讀取文字——本機 Tesseract 字元辨識本身偏弱（詳見
 *      projectTest/registration_ocr.py 的測試記錄），Gemini 的辨識率好得
 *      多。
 *   4. 只有 Gemini 呼叫本身出錯（額度/網路等基礎設施問題，不是「讀不清
 *      楚」）才會退回用本機 Tesseract 的讀值——這是容錯機制，不是常態路
 *      徑。`registrationVerification.method` 記錄這次實際是哪個引擎判定
 *      的，後台看得到。
 *
 * Pass requires ALL of:
 *   1. The local template-match check judged the photo to actually show a
 *      行照 (see step 2 above) — this gates BEFORE either OCR engine runs.
 *   2. An engine number was actually read off it.
 *   3. That read's confidence clears MIN_PASS_CONFIDENCE.
 * Anything else fails, with `note` carrying an explanation so the UI can
 * tell the user why and invite a retake — never a silent reject.
 *
 * Still written via Admin SDK only — firestore.rules blocks the client from
 * ever setting `registrationVerification` directly (see the vehicles/{id}
 * update rule) — only this function, and only after actually scanning the
 * photo, may set it.
 */
export async function verifyVehicleRegistration(params: {
  vehicleId: string
  documentUrl: string
  apiKey: string
}): Promise<VehicleRegistrationVerification> {
  const vehicleRef = getFirestore().collection('vehicles').doc(params.vehicleId)

  // 無論後面辨識成功與否，使用者既然已經把照片傳上 Storage，後台就該看得
  // 到這張最新的照片——如果等到最後才一次寫入，中途任何未預期的例外（角
  // 點偵測、樣板比對、Tesseract 等本機 pipeline 丟出的錯誤）都會讓這次呼
  // 叫整個失敗、連 registrationDocumentUrl 都不會被寫入，後台看起來就像
  // 沒人上傳過一樣。先寫一次最小版本，後面正常路徑會用完整結果覆蓋它。
  await vehicleRef.set({ registrationDocumentUrl: params.documentUrl }, { merge: true })

  const scan = await scanRegistration(params)

  const registrationVerification: VehicleRegistrationVerification = {
    status: scan.passed ? 'passed' : 'failed',
    ocrEngineNumber: scan.engineNumber,
    confidence: scan.confidence,
    note: scan.note,
    verifiedAt: Date.now(),
    method: scan.method,
  }
  const update: Record<string, unknown> = {
    registrationVerification,
    registrationDocumentUrl: params.documentUrl,
  }
  if (scan.maskedDocumentUrl) {
    update.registrationDocumentMaskedUrl = scan.maskedDocumentUrl
  }
  // OCR is treated as the authoritative source for this field once it finds
  // one — same reasoning as PREP-03/ENG-02 elsewhere: the physical document
  // beats a manually-typed value. Only written when actually found, since a
  // failed read shouldn't clobber an existing value with null.
  if (scan.engineNumber) {
    update.engineNumber = scan.engineNumber
  }
  await vehicleRef.set(update, { merge: true })
  return registrationVerification
}
