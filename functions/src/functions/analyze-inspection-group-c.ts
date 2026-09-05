import { onCall } from 'firebase-functions/v2/https'
import { GEMINI_API_KEY_SECRET } from '../config'
import { assertCanAnalyze } from '../services/auth.service'
import { analyzeGroupC, retryGroupCItem } from '../services/group-c-inspection.service'
import { GeminiVisionInspectionProvider } from '../ai/providers/vision-inspection-provider'

const provider = new GeminiVisionInspectionProvider()

export const analyzeInspectionGroupC = onCall(
  { secrets: [GEMINI_API_KEY_SECRET] },
  async (request) => {
    const { verificationId } = (request.data ?? {}) as { verificationId?: string }
    if (!verificationId) throw new Error('verificationId is required')
    const verification = await assertCanAnalyze(verificationId, request.auth?.uid)
    const results = await analyzeGroupC({
      verificationId,
      vehicleId: verification.vehicleId,
      apiKey: process.env.GEMINI_API_KEY as string,
      provider,
    })
    return { results }
  },
)

export const retryInspectionGroupCItem = onCall(
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
    const result = await retryGroupCItem({
      verificationId,
      itemId,
      newEvidenceId,
      apiKey: process.env.GEMINI_API_KEY as string,
      provider,
    })
    return { result }
  },
)
