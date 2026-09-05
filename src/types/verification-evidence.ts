export type EvidenceType = 'photo' | 'video' | 'audio' | 'voltage' | 'manual' | 'document' | 'imu'

export type CaptureSource = 'camera' | 'file' | 'probe' | 'manual'

export interface VerificationEvidence {
  id: string
  verificationId: string
  itemId: string
  type: EvidenceType

  /** Local blob/object URL — always set immediately after capture. */
  localUri?: string
  /** Firebase Storage object PATH (not a download URL — see
   * storageService.uploadEvidenceFile/resolveDownloadUrl and
   * useStorageUrl.ts) — set once the upload finishes. */
  remoteUrl?: string

  createdAt: number
  captureSource: CaptureSource
  captureTimestamp: number

  /** Free-form per-type data (voltage summary, damage-photo tap point, etc). */
  metadata?: Record<string, unknown>
}

export type AnswerResultValue = 'normal' | 'attention' | 'unsure' | 'not_applicable'

/** Mirrors functions/src/ai/schemas/common.ts's AiResultDoc — written only
 *  by the Trusted Backend (Cloud Functions Admin SDK), never by the client
 *  (see firestore.rules' answers.update rule and every Group A/B/C spec's
 *  "User 不可修改 AI result/aiResult" section). `Answer.note` below stays
 *  the User's own field; this is a completely separate, immutable-to-the-
 *  client channel. */
export interface AiResultDoc {
  model: string
  modelVersion: string
  confidence: number | null
  label: string
  details: {
    note: string | null
    analysisType?: 'vision' | 'audio' | 'imu'
    findings?: string[]
    regions?: string[]
    evidenceIds: string[]
    attempts: Array<{ attempt: number; result: AnswerResultValue; note: string | null }>
    finalAttempt: number
  }
}

export interface VerificationAnswer {
  itemId: string
  result: AnswerResultValue
  note?: string
  /** For type: 'form' items — the filled-in table values, keyed by FormFieldDef.key. */
  formData?: Record<string, string>
  /** Present once the Trusted Backend has analyzed this item (Group A/B/C
   *  vision, Engine Audio/IMU) — absent for plain manual-checklist items. */
  aiResult?: AiResultDoc
  updatedAt: number
}
