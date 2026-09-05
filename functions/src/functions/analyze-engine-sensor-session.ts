import { onCall } from 'firebase-functions/v2/https'
import { GEMINI_API_KEY_SECRET } from '../config'
import { assertCanAnalyze } from '../services/auth.service'
import {
  analyzeEngineIdle,
  analyzeEngineRev,
  analyzeEngineStartup,
} from '../services/engine-sensor-session.service'
import { GeminiAudioInspectionProvider } from '../ai/providers/audio-inspection-provider'

const provider = new GeminiAudioInspectionProvider()

type SensorSessionType = 'startup' | 'idle' | 'rev'

/**
 * One dispatch Function per the routing map's recommendation (§76: "我更推薦
 * analyzeEngineSensorSession，避免 client 控制分析種類"). `sessionType` is
 * not a model/prompt/result override — it only names which of the 3 fixed,
 * already-frozen sessions to analyze (mirrors how `itemId` is already a
 * client-supplied parameter on every Group A/B/C retry call in this same
 * spec family), so it doesn't violate that principle.
 */
export const analyzeEngineSensorSession = onCall(
  { secrets: [GEMINI_API_KEY_SECRET] },
  async (request) => {
    const { verificationId, sessionType } = (request.data ?? {}) as {
      verificationId?: string
      sessionType?: SensorSessionType
    }
    if (!verificationId || !sessionType) {
      throw new Error('verificationId and sessionType are required')
    }
    await assertCanAnalyze(verificationId, request.auth?.uid)
    const apiKey = process.env.GEMINI_API_KEY as string

    switch (sessionType) {
      case 'startup':
        return { results: await analyzeEngineStartup({ verificationId, apiKey, provider }) }
      case 'idle':
        return await analyzeEngineIdle({ verificationId, apiKey, provider })
      case 'rev':
        return await analyzeEngineRev({ verificationId, apiKey, provider })
      default:
        throw new Error(`Unknown sessionType: ${sessionType as string}`)
    }
  },
)
