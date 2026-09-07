import { onCall } from 'firebase-functions/v2/https'
import { GEMINI_API_KEY_SECRET } from '../config'
import { assertCanAnalyze } from '../services/auth.service'
import { analyzeCoreVisionV2, retryCoreVisionV2Item } from '../services/core-vision-v2.service'
import { GeminiVisionInspectionProvider } from '../ai/providers/vision-inspection-provider'
import { withAnalysisFailureTrace } from '../services/analysis-status.service'

const provider = new GeminiVisionInspectionProvider()

/** Verification v2 — supersedes analyzeInspectionGroupA/B/C. Client sends
 *  only `{verificationId}` — never model/prompt/requestedItems. */
export const analyzeCoreVisionV2Fn = onCall({ secrets: [GEMINI_API_KEY_SECRET] }, async (request) => {
  const { verificationId } = (request.data ?? {}) as { verificationId?: string }
  if (!verificationId) throw new Error('verificationId is required')
  return withAnalysisFailureTrace(verificationId, 'coreVision', async () => {
    const verification = await assertCanAnalyze(verificationId, request.auth?.uid)
    const results = await analyzeCoreVisionV2({
      verificationId,
      vehicleId: verification.vehicleId,
      apiKey: process.env.GEMINI_API_KEY as string,
      provider,
    })
    return { results }
  })
})

export const retryCoreVisionV2ItemFn = onCall(
  { secrets: [GEMINI_API_KEY_SECRET] },
  async (request) => {
    const { verificationId, itemId, newEvidenceId } = (request.data ?? {}) as {
      verificationId?: string
      itemId?: string
      newEvidenceId?: string
    }
    if (!verificationId || !itemId || !newEvidenceId) {
      throw new Error('verificationId, itemId, and newEvidenceId are required')
    }
    await assertCanAnalyze(verificationId, request.auth?.uid)
    const result = await retryCoreVisionV2Item({
      verificationId,
      itemId,
      newEvidenceId,
      apiKey: process.env.GEMINI_API_KEY as string,
      provider,
    })
    return { result }
  },
)
