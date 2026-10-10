import { onCall } from 'firebase-functions/v2/https'
import { GEMINI_API_KEY_SECRET } from '../config'
import { assertCanAnalyze } from '../services/auth.service'
import { analyzeHotEngineSensorSessionV2 } from '../services/engine-sensor-session.service'
import { GeminiAudioInspectionProvider } from '../ai/providers/audio-inspection-provider'
import { withAnalysisFailureTrace } from '../services/analysis-status.service'

const provider = new GeminiAudioInspectionProvider()

/** 熱車檢查 (buyer-verification.ts's HOT-04..07, reached after 上路) — mirrors
 *  analyze-engine-sensor-session.ts exactly, just against the hot pipeline
 *  (analyzeHotEngineSensorSessionV2, a shorter 18s idle+rev-only recording).
 *  Memory/timeout match the cold route for the same reason: the DSP
 *  pipeline does a real ffmpeg decode plus per-window feature extraction
 *  before Gemini is ever called. */
export const analyzeHotEngineSensorSessionV2Fn = onCall(
  { secrets: [GEMINI_API_KEY_SECRET], memory: '512MiB', timeoutSeconds: 120 },
  async (request) => {
    const { verificationId } = (request.data ?? {}) as { verificationId?: string }
    if (!verificationId) throw new Error('verificationId is required')
    return withAnalysisFailureTrace(verificationId, 'hotEngineSensorSession', async () => {
      await assertCanAnalyze(verificationId, request.auth?.uid)
      const apiKey = process.env.GEMINI_API_KEY as string
      return analyzeHotEngineSensorSessionV2({ verificationId, apiKey, provider })
    })
  },
)
