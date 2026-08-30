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
  severity?: ItemSeverity
  helpText?: string
  /** Shown under a disabled "下一步" when this item sits in a lockedOrder
   *  section and its required evidence hasn't been captured yet — explains
   *  WHY skipping isn't allowed (e.g. "發動後將無法補拍"), not just that it isn't. */
  lockedHint?: string
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
