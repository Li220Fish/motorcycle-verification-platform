import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useLocaleStore } from '@/stores/locale.store'
import { formatDateDivider, formatRelativeTime } from '@/utils/format-time'

const NOW = new Date(2026, 9, 18, 15, 30, 0).getTime() // 2026-10-18 15:30 local

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => vi.useRealTimers())

  it('returns empty string for a falsy timestamp', () => {
    expect(formatRelativeTime(0)).toBe('')
  })

  it('under one minute → 剛剛 / just now', () => {
    expect(formatRelativeTime(NOW - 30_000)).toBe('剛剛')
    useLocaleStore().locale = 'en'
    expect(formatRelativeTime(NOW - 30_000)).toBe('just now')
  })

  it('under one hour → N 分鐘前 / N min ago', () => {
    expect(formatRelativeTime(NOW - 5 * 60_000)).toBe('5 分鐘前')
    useLocaleStore().locale = 'en'
    expect(formatRelativeTime(NOW - 59 * 60_000)).toBe('59 min ago')
  })

  it('earlier today → HH:mm', () => {
    expect(formatRelativeTime(new Date(2026, 9, 18, 9, 5).getTime())).toBe('09:05')
  })

  it('yesterday → 昨天 HH:mm / Yesterday HH:mm', () => {
    const y = new Date(2026, 9, 17, 22, 0).getTime()
    expect(formatRelativeTime(y)).toBe('昨天 22:00')
    useLocaleStore().locale = 'en'
    expect(formatRelativeTime(y)).toBe('Yesterday 22:00')
  })

  it('earlier this year → M/D, other years → YYYY/M/D', () => {
    expect(formatRelativeTime(new Date(2026, 2, 4, 12, 0).getTime())).toBe('3/4')
    expect(formatRelativeTime(new Date(2025, 11, 31, 12, 0).getTime())).toBe('2025/12/31')
  })
})

describe('formatDateDivider', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })
  afterEach(() => vi.useRealTimers())

  it('today / yesterday / other dates in Chinese', () => {
    expect(formatDateDivider(NOW - 3600_000)).toBe('今天')
    expect(formatDateDivider(NOW - 24 * 3600_000)).toBe('昨天')
    expect(formatDateDivider(new Date(2026, 6, 9).getTime())).toBe('7 月 9 日')
  })

  it('today / yesterday / other dates in English', () => {
    useLocaleStore().locale = 'en'
    expect(formatDateDivider(NOW - 3600_000)).toBe('Today')
    expect(formatDateDivider(NOW - 24 * 3600_000)).toBe('Yesterday')
    expect(formatDateDivider(new Date(2026, 6, 9).getTime())).toBe('Jul 9')
  })
})
