import { onCall } from 'firebase-functions/v2/https'
import { GEMINI_API_KEY_SECRET } from '../config'
import { assertCanAnalyze } from '../services/auth.service'
import { analyzeChassisOcr, analyzeDashboardOcr, analyzePlateOcr } from '../ocr/ocr.service'

function readVerificationId(data: unknown): string {
  const verificationId = (data as { verificationId?: string })?.verificationId
  if (!verificationId) throw new Error('verificationId is required')
  return verificationId
}

export const analyzeOcrDashboard = onCall({ secrets: [GEMINI_API_KEY_SECRET] }, async (request) => {
  const verificationId = readVerificationId(request.data)
  await assertCanAnalyze(verificationId, request.auth?.uid)
  return analyzeDashboardOcr({ verificationId, apiKey: process.env.GEMINI_API_KEY as string })
})

export const analyzeOcrPlate = onCall({ secrets: [GEMINI_API_KEY_SECRET] }, async (request) => {
  const verificationId = readVerificationId(request.data)
  await assertCanAnalyze(verificationId, request.auth?.uid)
  return analyzePlateOcr({ verificationId, apiKey: process.env.GEMINI_API_KEY as string })
})

export const analyzeOcrChassis = onCall({ secrets: [GEMINI_API_KEY_SECRET] }, async (request) => {
  const verificationId = readVerificationId(request.data)
  await assertCanAnalyze(verificationId, request.auth?.uid)
  return analyzeChassisOcr({ verificationId, apiKey: process.env.GEMINI_API_KEY as string })
})
