import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import MonthCalendar from '@/components/marketplace/MonthCalendar.vue'
import { useLocaleStore } from '@/stores/locale.store'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 18, 10, 0)) // Sun 18 Oct 2026
})
afterEach(() => vi.useRealTimers())

const dayButton = (wrapper: ReturnType<typeof mount>, day: number) =>
  wrapper.findAll('button.day-cell').find((b) => b.text().trim() === String(day))!

describe('MonthCalendar', () => {
  it('renders the current month with leading blanks for the first weekday', () => {
    const wrapper = mount(MonthCalendar, { props: { highlightedDates: [] } })
    expect(wrapper.find('.month-label').text()).toBe('2026年 10月')
    // 1 Oct 2026 is a Thursday → 4 empty cells
    expect(wrapper.findAll('.day-cell.empty')).toHaveLength(4)
    expect(wrapper.findAll('button.day-cell')).toHaveLength(31)
  })

  it('past days are disabled; today and later are selectable', async () => {
    const wrapper = mount(MonthCalendar, { props: { highlightedDates: [] } })
    expect(dayButton(wrapper, 17).attributes('disabled')).toBeDefined()
    expect(dayButton(wrapper, 17).classes()).toContain('past')
    expect(dayButton(wrapper, 18).attributes('disabled')).toBeUndefined()
    await dayButton(wrapper, 20).trigger('click')
    expect(wrapper.emitted('selectDate')).toEqual([['2026-10-20']])
  })

  it('highlighted / selected (single + multi) / blue-dot days', () => {
    const wrapper = mount(MonthCalendar, {
      props: {
        highlightedDates: ['2026-10-20'],
        selectedDate: '2026-10-21',
        selectedDates: ['2026-10-22'],
        dottedDates: ['2026-10-23'],
      },
    })
    expect(dayButton(wrapper, 20).classes()).toContain('highlighted')
    expect(dayButton(wrapper, 21).classes()).toContain('selected')
    expect(dayButton(wrapper, 22).classes()).toContain('selected')
    expect(dayButton(wrapper, 23).find('.day-dot').exists()).toBe(true)
    expect(dayButton(wrapper, 24).find('.day-dot').exists()).toBe(false)
  })

  it('month navigation wraps across years', async () => {
    const wrapper = mount(MonthCalendar, { props: { highlightedDates: [] } })
    const [prev, next] = wrapper.findAll('.nav-btn')
    await next.trigger('click')
    await next.trigger('click')
    await next.trigger('click')
    expect(wrapper.find('.month-label').text()).toBe('2027年 1月')
    await prev.trigger('click')
    expect(wrapper.find('.month-label').text()).toBe('2026年 12月')
    // Next month's days are all in the future
    expect(wrapper.findAll('button.day-cell[disabled]')).toHaveLength(0)
  })

  it('English month name and weekday labels', () => {
    useLocaleStore().locale = 'en'
    const wrapper = mount(MonthCalendar, { props: { highlightedDates: [] } })
    expect(wrapper.find('.month-label').text()).toBe('October 2026')
    expect(wrapper.findAll('.weekday-row span').map((s) => s.text())).toHaveLength(7)
    expect(wrapper.find('.weekday-row').text()).not.toMatch(/[一-鿿]/)
  })
})
