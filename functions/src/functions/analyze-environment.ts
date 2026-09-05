import { onCall } from 'firebase-functions/v2/https'
import { GEMINI_API_KEY_SECRET } from '../config'
import { assertCanAnalyze } from '../services/auth.service'
import { analyzeEnvironment } from '../services/environment-analysis.service'

/** Step 3 (Environment Calibration) — Environment/Cold-State spec §35.
 *  Writes Verification.environmentContext only; no Answer document. */
export const analyzeEnvironmentSession = onCall(
  { secrets: [GEMINI_API_KEY_SECRET] },
  async (request) => {
    const { verificationId } = (request.data ?? {}) as { verificationId?: string }
    if (!verificationId) throw new Error('verificationId is required')
    await assertCanAnalyze(verificationId, request.auth?.uid)
    const apiKey = process.env.GEMINI_API_KEY as string
    await analyzeEnvironment({ verificationId, apiKey })
    return { status: 'ok' }
  },
)
