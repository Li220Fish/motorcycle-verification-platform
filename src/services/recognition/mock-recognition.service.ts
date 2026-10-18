import type { RecognitionService } from './recognition.interface'
import type {
  DocumentRecognitionResult,
  RecognitionInput,
  RecognitionResult,
} from './recognition.types'
import { lt } from '@/i18n/locale-text'

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
        errorMessage: lt(
          '影像分析暫時無法使用，請直接以人工判斷為主。',
          'Image analysis is unavailable right now — please judge manually.',
        ),
      }
    }
    if (scenario === 'issue') {
      return {
        status: 'review_required',
        confidence: 0.72,
        findings: [lt('可能有刮傷', 'Possible scratch')],
      }
    }
    return {
      status: 'completed',
      confidence: 0.91,
      findings: [lt('未發現明顯異常', 'No obvious issues found')],
    }
  }

  async analyzeDamage(input: RecognitionInput): Promise<RecognitionResult> {
    await delay(ANALYSIS_DELAY_MS)
    const scenario = input.scenario ?? 'issue'
    if (scenario === 'error') {
      return {
        status: 'error',
        findings: [],
        errorMessage: lt(
          '影像分析暫時無法使用，請直接以人工判斷為主。',
          'Image analysis is unavailable right now — please judge manually.',
        ),
      }
    }
    if (scenario === 'normal') {
      return {
        status: 'completed',
        confidence: 0.88,
        findings: [lt('未發現明顯異常', 'No obvious issues found')],
      }
    }
    return {
      status: 'review_required',
      confidence: 0.72,
      findings: [lt('可能有刮傷', 'Possible scratch')],
    }
  }

  async analyzeDocument(input: RecognitionInput): Promise<DocumentRecognitionResult> {
    await delay(ANALYSIS_DELAY_MS)
    const scenario = input.scenario ?? 'normal'
    if (scenario === 'error') {
      return {
        status: 'error',
        findings: [],
        errorMessage: lt(
          '文件辨識暫時無法使用，請手動輸入資料。',
          'Document recognition is unavailable right now — please enter the data manually.',
        ),
      }
    }
    return {
      status: 'completed',
      confidence: 0.85,
      findings: [lt('已辨識出行照欄位（測試模式）', 'Registration fields recognized (test mode)')],
      fields: {
        車牌: 'ABC-1234',
        車型: 'YAMAHA XXXXX',
        車主: '王**',
      },
    }
  }
}

export const mockRecognitionService = new MockRecognitionService()
