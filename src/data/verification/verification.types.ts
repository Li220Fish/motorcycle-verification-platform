/**
 * Content schema for the data-driven verification flow. Sections/items are
 * pure data (see seller-verification.ts / buyer-verification.ts) — the UI
 * (VerificationItemView, VerificationSectionCard, etc.) renders whatever
 * this config describes rather than hardcoding any check item.
 */

export type VerificationItemType =
  'check' | 'photo' | 'video' | 'audio' | 'voltage' | 'question' | 'document' | 'ride' | 'form'

export type ItemSeverity = 'normal' | 'important' | 'critical'

export type InspectionOptionValue = 'normal' | 'attention' | 'unsure' | 'not_applicable'

export interface InspectionOption {
  value: InspectionOptionValue
  label: string
}

export type EvidenceKind = 'photo' | 'video' | 'audio' | 'voltage' | 'document'

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
}

export interface VerificationSection {
  id: string
  title: string
  shortDescription: string
  order: number
  items: VerificationItem[]
}

export type VerificationFlowKind = 'seller' | 'buyer'
