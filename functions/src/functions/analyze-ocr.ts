import { onCall } from 'firebase-functions/v2/https'
import { GEMINI_API_KEY_SECRET } from '../config'
import { assertCanAnalyze } from '../services/auth.service'
import { analyzeDashboardOcr } from '../ocr/ocr.service'
import { withAnalysisFailureTrace } from '../services/analysis-status.service'

function readVerificationId(data: unknown): string {
  const verificationId = (data as { verificationId?: string })?.verificationId
  if (!verificationId) throw new Error('verificationId is required')
  return verificationId
}

/** Verification v2 — plate OCR (step 9) and chassis-number OCR (step 23)
 *  are removed along with those steps; dashboard OCR (step 7) is the only
 *  surviving OCR route. */
export const analyzeOcrDashboard = onCall({ secrets: [GEMINI_API_KEY_SECRET] }, async (request) => {
  const verificationId = readVerificationId(request.data)
  return withAnalysisFailureTrace(verificationId, 'dashboardOcr', async () => {
    await assertCanAnalyze(verificationId, request.auth?.uid)
    return analyzeDashboardOcr({ verificationId, apiKey: process.env.GEMINI_API_KEY as string })
  })
})
