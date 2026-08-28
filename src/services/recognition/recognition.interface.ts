import type {
  DocumentRecognitionResult,
  RecognitionInput,
  RecognitionResult,
} from './recognition.types'

export interface RecognitionService {
  analyzeImage(input: RecognitionInput): Promise<RecognitionResult>
  analyzeDocument(input: RecognitionInput): Promise<DocumentRecognitionResult>
  analyzeDamage(input: RecognitionInput): Promise<RecognitionResult>
}
