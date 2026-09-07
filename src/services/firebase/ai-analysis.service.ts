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

async function callGroupRetry(
  name: string,
  params: { verificationId: string; itemId: string; newEvidenceId: string },
): Promise<GeminiItemResultDto> {
  const call = httpsCallable<typeof params, { result: GeminiItemResultDto }>(functions, name)
  const response = await call(params)
  return response.data.result
}

/** Verification v2 — supersedes Group A/B/C (analyzeInspectionGroupA/B/C):
 * one consolidated route over the reduced Core Vision evidence set
 * (vehicle_left/right/rear, front_suspension, engine_bottom, conditionally
 * chain_sprocket). See functions/src/services/core-vision-v2.service.ts. */
export const analyzeCoreVisionV2 = (verificationId: string) =>
  callGroupAnalyze('analyzeCoreVisionV2', verificationId)
export const retryCoreVisionV2Item = (params: {
  verificationId: string
  itemId: string
  newEvidenceId: string
}) => callGroupRetry('retryCoreVisionV2Item', params)

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
  status: 'unverified' | 'passed' | 'attention'
  method: 'ocr' | 'test-bypass' | null
  inputNumber: string | null
  ocrEngineNumber: string | null
  ocrChassisNumber: string | null
  confidence: number | null
  note: string | null
  verifiedAt: number | null
}

/** 行照號碼 typed as "test" (case-insensitive) skips OCR entirely — a
 * deliberate QA/demo bypass, see functions/src/services/vehicle-registration.service.ts. */
export async function verifyVehicleRegistrationDocument(params: {
  vehicleId: string
  registrationNumberInput: string
  documentUrl?: string
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
