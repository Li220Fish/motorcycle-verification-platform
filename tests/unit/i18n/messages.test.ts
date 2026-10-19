import { describe, expect, it } from 'vitest'

import {
  BUYER_VERIFICATION_SECTIONS,
  getFlatItems,
  SELLER_VERIFICATION_SECTIONS,
} from '@/data/verification'
import { AI_VISION_ITEMS } from '@/data/verification/ai-vision-items'
import { BASIC_HEALTH_CHECK_ITEM_IDS } from '@/data/verification/basic-health-check-items'
import { ITEM_TEXTS_EN } from '@/i18n/item-texts-en'
import { lt } from '@/i18n/locale-text'
import { messages } from '@/i18n/messages'
import { useLocaleStore } from '@/stores/locale.store'

type Dict = Record<string, Record<string, string>>
const zh = messages.zh as unknown as Dict
const en = messages.en as unknown as Dict

const placeholders = (s: string): string[] => (s.match(/\{(\w+)\}/g) ?? []).sort()

describe('zh / en message parity', () => {
  it('both locales have the same sections', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort())
  })

  it.each(Object.keys(zh))('section "%s" has the same keys in both locales', (section) => {
    expect(Object.keys(en[section]).sort()).toEqual(Object.keys(zh[section]).sort())
  })

  it('every message is a non-empty string in both locales', () => {
    for (const section of Object.keys(zh)) {
      for (const key of Object.keys(zh[section])) {
        expect(typeof zh[section][key], `zh.${section}.${key}`).toBe('string')
        expect(zh[section][key].trim(), `zh.${section}.${key}`).not.toBe('')
        expect(en[section][key].trim(), `en.${section}.${key}`).not.toBe('')
      }
    }
  })

  it('{placeholders} match between zh and en', () => {
    // MonthCalendar.vue passes both {month} and {monthName}; each locale picks one.
    const deliberate = new Set(['calendar.monthLabel'])
    for (const section of Object.keys(zh)) {
      for (const key of Object.keys(zh[section])) {
        if (deliberate.has(`${section}.${key}`)) continue
        expect(placeholders(en[section][key]), `${section}.${key}`).toEqual(
          placeholders(zh[section][key]),
        )
      }
    }
  })

  it('English strings contain no leftover CJK characters (except deliberate language names)', () => {
    const allowed = new Set(['preferences.languageZh'])
    const offenders: string[] = []
    for (const section of Object.keys(en)) {
      for (const [key, value] of Object.entries(en[section])) {
        if (allowed.has(`${section}.${key}`)) continue
        if (/[一-鿿]/.test(value)) offenders.push(`${section}.${key}: ${value}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('brand is "RiD" — no stale "RiDE78" anywhere', () => {
    for (const dict of [zh, en]) {
      for (const section of Object.values(dict)) {
        for (const value of Object.values(section)) expect(value).not.toContain('RiDE78')
      }
    }
  })
})

describe('checklist translation coverage', () => {
  const sellerIds = getFlatItems('seller').map((f) => f.item.id)
  const buyerIds = getFlatItems('buyer').map((f) => f.item.id)
  const sectionIds = [...SELLER_VERIFICATION_SECTIONS, ...BUYER_VERIFICATION_SECTIONS].map(
    (s) => s.id,
  )
  const knownIds = new Set([
    ...sellerIds,
    ...buyerIds,
    ...sectionIds,
    ...BASIC_HEALTH_CHECK_ITEM_IDS,
    ...AI_VISION_ITEMS.map((a) => a.id),
  ])

  it('every checklist item and section has an English title in itemLabels', () => {
    const missing = [...new Set([...sellerIds, ...buyerIds, ...sectionIds])].filter(
      (id) => !en.itemLabels[id],
    )
    expect(missing).toEqual([])
  })

  it('ITEM_TEXTS_EN only references real item/section ids', () => {
    const unknown = Object.keys(ITEM_TEXTS_EN).filter((id) => !knownIds.has(id))
    expect(unknown).toEqual([])
  })

  it('ITEM_TEXTS_EN option overlays only use real answer values of that item', () => {
    for (const [id, text] of Object.entries(ITEM_TEXTS_EN)) {
      if (!text.options) continue
      for (const value of Object.keys(text.options)) {
        expect(text.options[value], `${id}.${value}`).toBeTruthy()
      }
    }
  })
})

describe('lt() service-level helper', () => {
  it('follows the current locale', () => {
    const store = useLocaleStore()
    expect(lt('中文', 'English')).toBe('中文')
    store.locale = 'en'
    expect(lt('中文', 'English')).toBe('English')
  })
})
