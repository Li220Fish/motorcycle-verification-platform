import type { InspectionOption } from './verification.types'

export const STANDARD_INSPECTION_OPTIONS: InspectionOption[] = [
  { value: 'normal', label: '正常' },
  { value: 'attention', label: '需要注意' },
  { value: 'unsure', label: '不確定' },
  { value: 'not_applicable', label: '不適用' },
]

/** Cold-check specific scale — see verification item type 'check' with a custom `options` override. */
export const COLD_CHECK_OPTIONS: InspectionOption[] = [
  { value: 'normal', label: '完全冷' },
  { value: 'attention', label: '微溫' },
  { value: 'unsure', label: '明顯有溫度' },
  { value: 'not_applicable', label: '無法安全確認' },
]
