import type { InspectionOption } from './verification.types'

export const STANDARD_INSPECTION_OPTIONS: InspectionOption[] = [
  { value: 'normal', label: '正常' },
  { value: 'attention', label: '須注意' },
  { value: 'unsure', label: '不確定' },
]
