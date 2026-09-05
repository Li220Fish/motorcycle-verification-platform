/**
 * Content schema for the data-driven verification flow. Sections/items are
 * pure data (see seller-verification.ts / buyer-verification.ts) — the UI
 * (VerificationItemView, VerificationSectionCard, etc.) renders whatever
 * this config describes rather than hardcoding any check item.
 */

export type VerificationItemType =
  | 'check'
  | 'photo'
  | 'video'
  | 'audio'
  | 'voltage'
  | 'question'
  | 'document'
  | 'ride'
  | 'form'
  | 'motion'
  /** Step 3 (驗車環境檢測) and Step 39 (冷車狀態確認) — fully custom capture
   *  screens swapped in at VerificationStepsView level (same pattern as the
   *  Engine Audio/IMU session group), never rendered via VerificationItem's
   *  generic per-type evidence-block dispatch. */
  | 'environment'
  | 'cold-touch'

export type ItemSeverity = 'normal' | 'important' | 'critical'

export type InspectionOptionValue = 'normal' | 'attention' | 'unsure' | 'not_applicable'

export interface InspectionOption {
  value: InspectionOptionValue
  label: string
}

export type EvidenceKind = 'photo' | 'video' | 'audio' | 'voltage' | 'document' | 'motion'

export interface EvidenceRequirement {
  kind: EvidenceKind
  /** Shown as the capture target, e.g. "車身左側" */
  label: string
  required: boolean
}

export type FormFieldType = 'text' | 'number' | 'date'

export interface FormFieldDef {
  key: string
  label: string
  type: FormFieldType
  placeholder?: string
  required?: boolean
  unit?: string
}

/** Which AI/OCR pass this item's photo evidence should offer — surfaced as
 *  an "影像輔助分析" action (mocked today, see mock-recognition.service.ts)
 *  rather than auto-run, same reasoning DocumentEvidenceCapture.vue already
 *  uses: a v0.2 mock result must never look like an authoritative verdict. */
export type AiCheckKind = 'appearance' | 'plate' | 'odometer' | 'vin' | 'document'

export interface VerificationItem {
  id: string
  title: string
  description: string
  instruction?: string
  type: VerificationItemType
  required: boolean
  evidence?: EvidenceRequirement[]
  /** Overrides the standard 正常/需要注意/不確定/不適用 options for this item. */
  options?: InspectionOption[]
  /** For type: 'form' — renders a compact fillable table instead of free text. */
  formFields?: FormFieldDef[]
  mockAnalysis?: boolean
  /** Replaces the unused `mockAnalysis` flag above with what it should
   *  actually say: which recognition pass applies, not just "some AI runs." */
  aiCheck?: AiCheckKind
  /** True for items whose photo prompt should differ by transmission type
   *  (CVT scooter vs chain-drive manual) — see Vehicle.transmission and
   *  PhotoGuide.vue's per-item prompt text. */
  transmissionSensitive?: boolean
  /** True when this item's evidence step can share one continuous
   *  recording with the item(s) right after it (e.g. 啟動馬達聲音 +
   *  發動順暢度) — purely a UI hint text, capture is still per-item. */
  canShareCapture?: boolean
  severity?: ItemSeverity
  helpText?: string
  /** Shown under a disabled "下一步" when this item sits in a lockedOrder
   *  section and its required evidence hasn't been captured yet — explains
   *  WHY skipping isn't allowed (e.g. "發動後將無法補拍"), not just that it isn't. */
  lockedHint?: string
  /** Conditional branch: when this item's saved answer matches `value`, the
   *  flow jumps straight to `skipToItemId` instead of the next item in
   *  document order, auto-marking whatever sits between them as
   *  not_applicable (see verification.store.ts's resolveNextIndex). Only
   *  meaningful on items with a `type:'check'`-style result (not 'form'). */
  branch?: { value: InspectionOptionValue; skipToItemId: string }[]
}

export interface VerificationSection {
  id: string
  title: string
  shortDescription: string
  order: number
  items: VerificationItem[]
  /** When true, items in this section can only be reached via Prev/Next —
   *  no free jump between steps (e.g. 引擎狀況, where the checks are
   *  procedurally ordered: don't rev the engine before the cold check). */
  lockedOrder?: boolean
}

export type VerificationFlowKind = 'seller' | 'buyer'
