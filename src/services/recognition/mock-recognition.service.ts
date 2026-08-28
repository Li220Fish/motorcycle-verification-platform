import type { RecognitionService } from './recognition.interface'
import type {
  DocumentRecognitionResult,
  RecognitionInput,
  RecognitionResult,
} from './recognition.types'

const ANALYSIS_DELAY_MS = 900

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * All "AI" in V0.2 is this mock. No image/vision/OCR API is ever called —
 * results are deterministic by `scenario` so the UI states (idle / analyzing
 * / completed / review_required / error) are reproducible in tests. See
 * V0.2 spec §17–§19 and future-ai-recognition.service.ts for the real
 * implementation's future home.
 */
class MockRecognitionService implements RecognitionService {
  async analyzeImage(input: RecognitionInput): Promise<RecognitionResult> {
    await delay(ANALYSIS_DELAY_MS)
    const scenario = input.scenario ?? 'normal'
    if (scenario === 'error') {
      return {
        status: 'error',
        findings: [],
        errorMessage: '影像分析暫時無法使用，請直接以人工判斷為主。',
      }
    }
    if (scenario === 'issue') {
      return { status: 'review_required', confidence: 0.72, findings: ['可能有刮傷'] }
    }
    return { status: 'completed', confidence: 0.91, findings: ['未發現明顯異常'] }
  }

  async analyzeDamage(input: RecognitionInput): Promise<RecognitionResult> {
    await delay(ANALYSIS_DELAY_MS)
    const scenario = input.scenario ?? 'issue'
    if (scenario === 'error') {
      return {
        status: 'error',
        findings: [],
        errorMessage: '影像分析暫時無法使用，請直接以人工判斷為主。',
      }
    }
    if (scenario === 'normal') {
      return { status: 'completed', confidence: 0.88, findings: ['未發現明顯異常'] }
    }
    return { status: 'review_required', confidence: 0.72, findings: ['可能有刮傷'] }
  }

  async analyzeDocument(input: RecognitionInput): Promise<DocumentRecognitionResult> {
    await delay(ANALYSIS_DELAY_MS)
    const scenario = input.scenario ?? 'normal'
    if (scenario === 'error') {
      return {
        status: 'error',
        findings: [],
        errorMessage: '文件辨識暫時無法使用，請手動輸入資料。',
      }
    }
    return {
      status: 'completed',
      confidence: 0.85,
      findings: ['已辨識出行照欄位（測試模式）'],
      fields: {
        車牌: 'ABC-1234',
        車型: 'YAMAHA XXXXX',
        車主: '王**',
      },
    }
  }
}

export const mockRecognitionService = new MockRecognitionService()
