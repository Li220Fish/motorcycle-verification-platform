import type { RecognitionService } from './recognition.interface'
import type {
  DocumentRecognitionResult,
  RecognitionInput,
  RecognitionResult,
} from './recognition.types'

/**
 * Placeholder for a real vision/OCR-backed implementation. V0.2 explicitly
 * forbids wiring any external AI API (OpenAI Vision, Gemini, Google Vision,
 * AWS Rekognition, etc.) — every caller must go through
 * mockRecognitionService until a real provider is chosen and approved.
 */
class FutureAiRecognitionService implements RecognitionService {
  async analyzeImage(_input: RecognitionInput): Promise<RecognitionResult> {
    throw new Error('Real AI recognition is not implemented yet. Use mockRecognitionService.')
  }

  async analyzeDamage(_input: RecognitionInput): Promise<RecognitionResult> {
    throw new Error('Real AI recognition is not implemented yet. Use mockRecognitionService.')
  }

  async analyzeDocument(_input: RecognitionInput): Promise<DocumentRecognitionResult> {
    throw new Error('Real AI recognition is not implemented yet. Use mockRecognitionService.')
  }
}

export const futureAiRecognitionService = new FutureAiRecognitionService()
