import { onCall } from 'firebase-functions/v2/https'
import { GEMINI_API_KEY_SECRET } from '../config'
import { assertCanAnalyze } from '../services/auth.service'
import { analyzeColdEngineTouch, retryColdEngineTouch } from '../services/cold-touch.service'

/** Step 39 (Cold-state eligibility check) — Environment/Cold-State spec
 *  §36. Client sends only `verificationId`; the app-timed contact-window
 *  metadata already lives on the Evidence doc itself (system truth,
 *  written at capture time — see cold-touch.service.ts). */
export const analyzeColdEngineTouchCheck = onCall(
  { secrets: [GEMINI_API_KEY_SECRET] },
  async (request) => {
    const { verificationId } = (request.data ?? {}) as { verificationId?: string }
    if (!verificationId) throw new Error('verificationId is required')
    await assertCanAnalyze(verificationId, request.auth?.uid)
    const apiKey = process.env.GEMINI_API_KEY as string
    const result = await analyzeColdEngineTouch({ verificationId, apiKey })
    return { result }
  },
)

export const retryColdEngineTouchCheck = onCall(
  { secrets: [GEMINI_API_KEY_SECRET] },
  async (request) => {
    const { verificationId, newEvidenceId } = (request.data ?? {}) as {
      verificationId?: string
      newEvidenceId?: string
    }
    if (!verificationId || !newEvidenceId) {
      throw new Error('verificationId and newEvidenceId are required')
    }
    await assertCanAnalyze(verificationId, request.auth?.uid)
    const apiKey = process.env.GEMINI_API_KEY as string
    const result = await retryColdEngineTouch({ verificationId, apiKey, newEvidenceId })
    return { result }
  },
)
