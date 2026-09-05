/** Shared types for the whole AI routing layer — see
 *  MotoVerify_Verification_Step_API_Routing_Map.md §0-§2 and the three
 *  Group A/B/C spec files' "Structured Output" sections. `cannot_check` is
 *  explicitly retired (merged into `unsure`) across all of them. */
export type ResultValue = 'normal' | 'attention' | 'unsure' | 'not_applicable'

export const RESULT_VALUES: ResultValue[] = ['normal', 'attention', 'unsure', 'not_applicable']

/** Raw shape Gemini is asked to return per item (structured output). */
export interface GeminiItemResult {
  itemId: string
  result: ResultValue
  confidence: number | null
  label: string
  note: string | null
  evidenceIds: string[]
  problematicEvidenceIds: string[]
  retakeInstruction: string | null
  details?: Record<string, unknown>
}

export interface GeminiResponseEnvelope {
  results: GeminiItemResult[]
}

export interface PromptVersion {
  global: string
  group: string
  retry: string | null
}

export interface AiAttempt {
  attempt: number
  result: ResultValue
  confidence: number | null
  label: string
  note: string | null
  evidenceIds: string[]
}

/** Written to `Answer.aiResult` — never written or editable by the client
 *  (see each Group spec's Security section). `model` doubles as a generic
 *  "analysis engine identifier" for non-Gemini (e.g. IMU) results — see
 *  Engine Audio/IMU Technical spec §66. */
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
    balanceWeightVisible?: boolean | null
    brakeTypeVisible?: 'disc' | 'drum' | 'uncertain'
    /** cold_engine_touch_check only (Engine Environment/Cold-State spec
     *  §27) — whether the 5-second contact procedure was visually verified,
     *  and the resulting cold-state eligibility flag Startup/Idle/Rev's
     *  own sessions later read (engine-sensor-session.service.ts). */
    contactVisible?: boolean
    contactMaintainedFullWindow?: boolean
    targetAreaVisible?: boolean
    coldStateValid?: boolean
    evidenceIds: string[]
    promptVersion?: PromptVersion
    featureVersion?: string
    attempts: AiAttempt[]
    finalAttempt: number
  }
}

export class InvalidAiResponseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidAiResponseError'
  }
}

/** API/transport failures (429, 5xx, timeout, empty response, invalid JSON,
 *  schema validation failure) — see every spec file's "API Error != unsure"
 *  section. These must never be written as `result: "unsure"`; the caller
 *  surfaces a retryable system error to the client instead. */
export class GeminiSystemError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GeminiSystemError'
  }
}
