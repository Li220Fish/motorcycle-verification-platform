import { onCall } from 'firebase-functions/v2/https'
import { GEMINI_API_KEY_SECRET } from '../config'
import { assertCanAnalyze } from '../services/auth.service'
import { analyzeColdEngineTouch, retryColdEngineTouch } from '../services/cold-touch.service'
import { withAnalysisFailureTrace } from '../services/analysis-status.service'

// memory: ffmpeg frame extraction from the cold-touch video ran past Gen2's
// 256MiB default (found live 2026-11: every call OOM-killed, which also
// skipped withAnalysisFailureTrace, leaving the client waiting forever).
const COLD_TOUCH_OPTIONS = { secrets: [GEMINI_API_KEY_SECRET], memory: '1GiB' as const, timeoutSeconds: 120 }

/** Step 39 (Cold-state eligibility check) — Environment/Cold-State spec
 *  §36. Client sends only `verificationId`; the app-timed contact-window
 *  metadata already lives on the Evidence doc itself (system truth,
 *  written at capture time — see cold-touch.service.ts). */
export const analyzeColdEngineTouchCheck = onCall(
  COLD_TOUCH_OPTIONS,
  async (request) => {
    const { verificationId } = (request.data ?? {}) as { verificationId?: string }
    if (!verificationId) throw new Error('verificationId is required')
    return withAnalysisFailureTrace(verificationId, 'coldCheck', async () => {
      await assertCanAnalyze(verificationId, request.auth?.uid)
      const apiKey = process.env.GEMINI_API_KEY as string
      const result = await analyzeColdEngineTouch({ verificationId, apiKey })
      return { result }
    })
  },
)

export const retryColdEngineTouchCheck = onCall(
  COLD_TOUCH_OPTIONS,
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
