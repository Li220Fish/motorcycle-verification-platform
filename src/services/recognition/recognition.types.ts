export type RecognitionStatus = 'idle' | 'analyzing' | 'completed' | 'review_required' | 'error'

export interface RecognitionResult {
  status: RecognitionStatus
  confidence?: number
  findings: string[]
  errorMessage?: string
}

export interface DocumentRecognitionResult extends RecognitionResult {
  fields?: Record<string, string>
}

/** Deterministic mock scenario — never randomized, so UI tests stay stable. */
export type MockScenario = 'normal' | 'issue' | 'error'

export interface RecognitionInput {
  itemId: string
  imageUri: string
  scenario?: MockScenario
}
