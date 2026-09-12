import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'

/**
 * Thin callable wrappers over the Trusted Backend (functions/) — every
 * spec file's "Client 只應傳 verificationId / itemId / newEvidenceId, never
 * model/prompt/result" is enforced simply by these functions accepting
 * nothing else. See functions/src/functions/*.ts for the actual analysis.
 */

export interface GeminiItemResultDto {
  itemId: string
  result: 'normal' | 'attention' | 'unsure' | 'not_applicable'
  confidence: number | null
  label: string
  note: string | null
  evidenceIds: string[]
  problematicEvidenceIds: string[]
  retakeInstruction: string | null
}

async function callGroupAnalyze(
  name: string,
  verificationId: string,
): Promise<GeminiItemResultDto[]> {
  const call = httpsCallable<{ verificationId: string }, { results: GeminiItemResultDto[] }>(
    functions,
    name,
  )
  const response = await call({ verificationId })
  return response.data.results
}

/** Verification v2 — supersedes Group A/B/C (analyzeInspectionGroupA/B/C),
 * then itself split 2026-09 into 4 independent routes, one per photo group,
 * so each fires as soon as its own photo(s) exist and each item's prompt
 * criteria can be tuned independently. See
 * functions/src/services/core-vision-split.service.ts. No retry route on
 * any of these — the capture flow now forces the torch on for every core
 * photo (CorePhotoCaptureFlow.vue), which was the actual cause of the
 * low-light "insufficient_visibility" results a retry existed to work
 * around; no UI ever called retryCoreVisionV2Item either (InspectionReportBody
 * .vue's `canRetry` field was declared but never set), so it and its 8
 * dedicated retry prompts were removed outright rather than kept unreachable
 * (2026-09). */
export const analyzeCoreVisionSides = (verificationId: string) =>
  callGroupAnalyze('analyzeCoreVisionSides', verificationId)

export const analyzeCoreVisionRear = (verificationId: string) =>
  callGroupAnalyze('analyzeCoreVisionRear', verificationId)

export const analyzeCoreVisionFrontSuspension = (verificationId: string) =>
  callGroupAnalyze('analyzeCoreVisionFrontSuspension', verificationId)

export const analyzeCoreVisionEngineBottom = (verificationId: string) =>
  callGroupAnalyze('analyzeCoreVisionEngineBottom', verificationId)

export interface OcrResultDto {
  text: string | null
  confidence: number | null
  note: string | null
  evidenceId: string
}

async function callOcr(name: string, verificationId: string): Promise<OcrResultDto> {
  const call = httpsCallable<{ verificationId: string }, OcrResultDto>(functions, name)
  const response = await call({ verificationId })
  return response.data
}

// Plate/chassis OCR (steps 9/23) are removed along with those steps in
// Verification v2 — dashboard OCR (step 7) is the only surviving OCR route,
// now on the stricter dashboard-ocr-v2 prompt (server-side only change).
export const analyzeOcrDashboard = (verificationId: string) =>
  callOcr('analyzeOcrDashboard', verificationId)

/** Verification v2 §26/§28 — the 3 separate startup/idle/rev sessions merge
 * into ONE fixed 23-second synchronized Audio+IMU recording, so this is now
 * a single no-argument call (no more `sessionType`) — one Gemini audio call,
 * not three. See functions/src/services/engine-sensor-session.service.ts. */
export async function analyzeEngineSensorSessionV2(verificationId: string): Promise<unknown> {
  const call = httpsCallable<{ verificationId: string }, unknown>(
    functions,
    'analyzeEngineSensorSessionV2',
  )
  const response = await call({ verificationId })
  return response.data
}

export async function analyzeColdEngineTouchCheck(
  verificationId: string,
): Promise<GeminiItemResultDto> {
  const call = httpsCallable<{ verificationId: string }, { result: GeminiItemResultDto }>(
    functions,
    'analyzeColdEngineTouchCheck',
  )
  const response = await call({ verificationId })
  return response.data.result
}

export async function retryColdEngineTouchCheck(params: {
  verificationId: string
  newEvidenceId: string
}): Promise<GeminiItemResultDto> {
  const call = httpsCallable<typeof params, { result: GeminiItemResultDto }>(
    functions,
    'retryColdEngineTouchCheck',
  )
  const response = await call(params)
  return response.data.result
}

export interface VehicleRegistrationVerificationDto {
  status: 'unverified' | 'passed'
  ocrEngineNumber: string | null
  confidence: number | null
  note: string | null
  verifiedAt: number | null
}

/** 行照驗證 — 使用者只需上傳行照照片，不用輸入任何文字。Gemini 仍會真的
 * OCR 讀取引擎號碼供顯示，但通過與否不取決於 OCR 結果——上傳照片即算
 * 通過，見 functions/src/services/vehicle-registration.service.ts。 */
export async function verifyVehicleRegistrationDocument(params: {
  vehicleId: string
  documentUrl: string
}): Promise<VehicleRegistrationVerificationDto> {
  const call = httpsCallable<typeof params, VehicleRegistrationVerificationDto>(
    functions,
    'verifyVehicleRegistrationDocument',
  )
  const response = await call(params)
  return response.data
}

export async function analyzeDocumentMaintenance(
  verificationId: string,
  evidenceId: string,
): Promise<{ status: string }> {
  const call = httpsCallable<{ verificationId: string; evidenceId: string }, { status: string }>(
    functions,
    'analyzeDocumentMaintenance',
  )
  const response = await call({ verificationId, evidenceId })
  return response.data
}
