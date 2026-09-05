import type { AnswerResultValue } from '@/types/verification-evidence'

/** Shared by the real VerificationReportView and the Marketplace mock report
 * so both render the exact same 正常／需要注意／... vocabulary. */
export const RESULT_LABEL: Record<AnswerResultValue, string> = {
  normal: '正常',
  attention: '須注意',
  unsure: '不確定',
  not_applicable: '不適用',
}

export const RESULT_TONE: Record<AnswerResultValue, 'success' | 'warning' | 'neutral'> = {
  normal: 'success',
  attention: 'warning',
  unsure: 'warning',
  not_applicable: 'neutral',
}
