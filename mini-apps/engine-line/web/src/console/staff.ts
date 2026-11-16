import type { InjectionKey, Ref } from 'vue'

export interface StaffIdentity {
  uid: string
  name: string
}

export const STAFF_KEY: InjectionKey<Ref<StaffIdentity | null>> = Symbol('staff')

export const STATUS_LABEL: Record<string, string> = {
  open: '待處理',
  in_progress: '處理中',
  resolved: '已結案',
}

export const CATEGORY_LABEL: Record<string, string> = {
  report: '問題回報',
  human: '找真人',
  check_followup: '檢測疑問',
}

export const TICKET_LABELS = ['異音', '怠速', '起步/加速', '電系', '漏油', '保養諮詢', '研究樣本', '需實車檢查']

export function formatTime(value: { toDate?: () => Date } | null | undefined): string {
  const date = value?.toDate?.()
  if (!date) return ''
  return date.toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
}
