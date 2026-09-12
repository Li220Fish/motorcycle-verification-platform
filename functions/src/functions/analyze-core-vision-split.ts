import { onCall } from 'firebase-functions/v2/https'
import { GEMINI_API_KEY_SECRET } from '../config'
import { assertCanAnalyze } from '../services/auth.service'
import {
  analyzeCoreVisionEngineBottom,
  analyzeCoreVisionFrontSuspension,
  analyzeCoreVisionRear,
  analyzeCoreVisionSides,
} from '../services/core-vision-split.service'
import { GeminiVisionInspectionProvider } from '../ai/providers/vision-inspection-provider'
import { withAnalysisFailureTrace } from '../services/analysis-status.service'

const provider = new GeminiVisionInspectionProvider()

function requireVerificationId(data: unknown): string {
  const { verificationId } = (data ?? {}) as { verificationId?: string }
  if (!verificationId) throw new Error('verificationId is required')
  return verificationId
}

/** Verification v2 (2026-09) — supersedes the single analyzeCoreVisionV2,
 *  split into 4 independent routes (one per photo group) so each fires as
 *  soon as its own photo(s) exist and each item's prompt criteria can be
 *  tuned independently — see core-vision-split.service.ts. Client sends
 *  only `{verificationId}` — never model/prompt/requestedItems. No retry
 *  route on any of these (same reasoning as the route they replace — see
 *  ai-analysis.service.ts's doc comment on the old analyzeCoreVisionV2). */
export const analyzeCoreVisionSidesFn = onCall(
  { secrets: [GEMINI_API_KEY_SECRET] },
  async (request) => {
    const verificationId = requireVerificationId(request.data)
    return withAnalysisFailureTrace(verificationId, 'coreVisionSides', async () => {
      const verification = await assertCanAnalyze(verificationId, request.auth?.uid)
      const results = await analyzeCoreVisionSides({
        verificationId,
        vehicleId: verification.vehicleId,
        apiKey: process.env.GEMINI_API_KEY as string,
        provider,
      })
      return { results }
    })
  },
)

export const analyzeCoreVisionRearFn = onCall(
  { secrets: [GEMINI_API_KEY_SECRET] },
  async (request) => {
    const verificationId = requireVerificationId(request.data)
    return withAnalysisFailureTrace(verificationId, 'coreVisionRear', async () => {
      const verification = await assertCanAnalyze(verificationId, request.auth?.uid)
      const results = await analyzeCoreVisionRear({
        verificationId,
        vehicleId: verification.vehicleId,
        apiKey: process.env.GEMINI_API_KEY as string,
        provider,
      })
      return { results }
    })
  },
)

export const analyzeCoreVisionFrontSuspensionFn = onCall(
  { secrets: [GEMINI_API_KEY_SECRET] },
  async (request) => {
    const verificationId = requireVerificationId(request.data)
    return withAnalysisFailureTrace(verificationId, 'coreVisionFrontSuspension', async () => {
      const verification = await assertCanAnalyze(verificationId, request.auth?.uid)
      const results = await analyzeCoreVisionFrontSuspension({
        verificationId,
        vehicleId: verification.vehicleId,
        apiKey: process.env.GEMINI_API_KEY as string,
        provider,
      })
      return { results }
    })
  },
)

export const analyzeCoreVisionEngineBottomFn = onCall(
  { secrets: [GEMINI_API_KEY_SECRET] },
  async (request) => {
    const verificationId = requireVerificationId(request.data)
    return withAnalysisFailureTrace(verificationId, 'coreVisionEngineBottom', async () => {
      const verification = await assertCanAnalyze(verificationId, request.auth?.uid)
      const results = await analyzeCoreVisionEngineBottom({
        verificationId,
        vehicleId: verification.vehicleId,
        apiKey: process.env.GEMINI_API_KEY as string,
        provider,
      })
      return { results }
    })
  },
)
