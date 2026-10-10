import { onCall } from 'firebase-functions/v2/https'
import { GEMINI_API_KEY_SECRET } from '../config'
import { assertCanAnalyze } from '../services/auth.service'
import { analyzeEngineSensorSessionV2 } from '../services/engine-sensor-session.service'
import { GeminiAudioInspectionProvider } from '../ai/providers/audio-inspection-provider'
import { withAnalysisFailureTrace } from '../services/analysis-status.service'

const provider = new GeminiAudioInspectionProvider()

/** Verification v2 — supersedes the old 3-dispatch (`sessionType: 'startup'
 *  | 'idle' | 'rev'`) analyzeEngineSensorSession. ONE call now covers the
 *  whole 23s session (spec §26/§28), so no `sessionType` parameter is
 *  needed at all — client sends only `{verificationId}`.
 *
 * Engine Audio v3 (2026-09): memory/timeout bumped above Gen2's defaults
 * (256MiB/60s) — the DSP pipeline now does an ffmpeg decode plus per-window
 * DFT/feature-extraction work over the full 23s recording before Gemini is
 * even called, which the old single-Gemini-call flow never needed. */
export const analyzeEngineSensorSessionV2Fn = onCall(
  { secrets: [GEMINI_API_KEY_SECRET], memory: '512MiB', timeoutSeconds: 120 },
  async (request) => {
    const { verificationId } = (request.data ?? {}) as { verificationId?: string }
    if (!verificationId) throw new Error('verificationId is required')
    return withAnalysisFailureTrace(verificationId, 'engineSensorSession', async () => {
      await assertCanAnalyze(verificationId, request.auth?.uid)
      const apiKey = process.env.GEMINI_API_KEY as string
      return analyzeEngineSensorSessionV2({ verificationId, apiKey, provider })
    })
  },
)
