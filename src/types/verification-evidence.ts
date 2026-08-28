export type EvidenceType = 'photo' | 'video' | 'audio' | 'voltage' | 'manual'

export type CaptureSource = 'camera' | 'file' | 'probe' | 'manual'

export interface VerificationEvidence {
  id: string
  verificationId: string
  itemId: string
  type: EvidenceType

  /** Local blob/object URL — always set immediately after capture. */
  localUri?: string
  /** Firebase Storage download URL — set once the upload finishes. */
  remoteUrl?: string

  createdAt: number
  captureSource: CaptureSource
  captureTimestamp: number

  /** Free-form per-type data (voltage summary, damage-photo tap point, etc). */
  metadata?: Record<string, unknown>
}

export type AnswerResultValue =
  'normal' | 'attention' | 'unsure' | 'not_applicable' | 'cannot_check'

export interface VerificationAnswer {
  itemId: string
  result: AnswerResultValue
  note?: string
  cannotCheckReason?: string
  /** For type: 'form' items — the filled-in table values, keyed by FormFieldDef.key. */
  formData?: Record<string, string>
  updatedAt: number
}
