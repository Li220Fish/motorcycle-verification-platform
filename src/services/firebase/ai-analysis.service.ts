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

export const analyzeInspectionGroupA = (verificationId: string) =>
  callGroupAnalyze('analyzeInspectionGroupA', verificationId)
export const retryInspectionGroupAItem = (params: {
  verificationId: string
  itemId: string
  newEvidenceId: string
}) => callGroupRetry('retryInspectionGroupAItem', params)

export const analyzeInspectionGroupB = (verificationId: string) =>
  callGroupAnalyze('analyzeInspectionGroupB', verificationId)
export const retryInspectionGroupBItem = (params: {
  verificationId: string
  itemId: string
  newEvidenceId: string
}) => callGroupRetry('retryInspectionGroupBItem', params)

export const analyzeInspectionGroupC = (verificationId: string) =>
  callGroupAnalyze('analyzeInspectionGroupC', verificationId)
export const retryInspectionGroupCItem = (params: {
  verificationId: string
  itemId: string
  newEvidenceId: string
}) => callGroupRetry('retryInspectionGroupCItem', params)

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

export const analyzeOcrDashboard = (verificationId: string) =>
  callOcr('analyzeOcrDashboard', verificationId)
export const analyzeOcrPlate = (verificationId: string) =>
  callOcr('analyzeOcrPlate', verificationId)
export const analyzeOcrChassis = (verificationId: string) =>
  callOcr('analyzeOcrChassis', verificationId)

export type EngineSensorSessionType = 'startup' | 'idle' | 'rev'

export async function analyzeEngineSensorSession(
  verificationId: string,
  sessionType: EngineSensorSessionType,
): Promise<unknown> {
  const call = httpsCallable<
    { verificationId: string; sessionType: EngineSensorSessionType },
    unknown
  >(functions, 'analyzeEngineSensorSession')
  const response = await call({ verificationId, sessionType })
  return response.data
}

export async function analyzeEnvironmentSession(
  verificationId: string,
): Promise<{ status: string }> {
  const call = httpsCallable<{ verificationId: string }, { status: string }>(
    functions,
    'analyzeEnvironmentSession',
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
