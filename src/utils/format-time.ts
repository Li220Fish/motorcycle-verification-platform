import { useLocaleStore } from '@/stores/locale.store'

/** Single shared clock-formatting rule for chat/discussion timestamps (§71). */
export function formatRelativeTime(ms: number): string {
  if (!ms) return ''
  const en = useLocaleStore().locale === 'en'
  const now = Date.now()
  const diffMs = now - ms
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return en ? 'just now' : '剛剛'
  if (diffMin < 60) return en ? `${diffMin} min ago` : `${diffMin} 分鐘前`

  const date = new Date(ms)
  const today = new Date()
  const isToday = date.toDateString() === today.toDateString()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')

  if (isToday) return `${hh}:${mm}`
  if (isYesterday) return en ? `Yesterday ${hh}:${mm}` : `昨天 ${hh}:${mm}`
  if (date.getFullYear() === today.getFullYear()) {
    return `${date.getMonth() + 1}/${date.getDate()}`
  }
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

/** Chat date-divider labels — coarser than formatRelativeTime (§25). */
export function formatDateDivider(ms: number): string {
  const date = new Date(ms)
  const today = new Date()
  const isToday = date.toDateString() === today.toDateString()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  const en = useLocaleStore().locale === 'en'
  if (isToday) return en ? 'Today' : '今天'
  if (isYesterday) return en ? 'Yesterday' : '昨天'
  return en
    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : `${date.getMonth() + 1} 月 ${date.getDate()} 日`
}
