import { describe, expect, it } from 'vitest'

import { useI18n } from '@/composables/useI18n'
import { ITEM_TEXTS_EN } from '@/i18n/item-texts-en'
import { messages } from '@/i18n/messages'
import { useLocaleStore } from '@/stores/locale.store'

function setup(locale: 'zh' | 'en') {
  useLocaleStore().locale = locale
  return useI18n()
}

describe('useI18n', () => {
  it('t() resolves per locale and reacts to switching', () => {
    const i18n = setup('zh')
    expect(i18n.t('nav', 'home')).toBe(messages.zh.nav.home)
    useLocaleStore().locale = 'en'
    expect(i18n.t('nav', 'home')).toBe(messages.en.nav.home)
  })

  it('t() fills {placeholders}, blanking unknown ones', () => {
    const { t } = setup('zh')
    const entry = Object.entries(messages.zh).flatMap(([section, dict]) =>
      Object.entries(dict as Record<string, string>)
        .filter(([, v]) => /\{(\w+)\}/.test(v))
        .map(([key, v]) => ({ section, key, v })),
    )[0]
    expect(entry).toBeDefined()
    const name = entry.v.match(/\{(\w+)\}/)![1]
    const out = (t as (s: string, k: string, p?: Record<string, string>) => string)(
      entry.section,
      entry.key,
      { [name]: 'XYZ' },
    )
    expect(out).toContain('XYZ')
    expect(out).not.toContain(`{${name}}`)
    const blank = (t as (s: string, k: string, p?: Record<string, string>) => string)(
      entry.section,
      entry.key,
      {},
    )
    expect(blank).not.toContain(`{${name}}`)
  })

  it('tItem uses itemLabels, falling back for unknown ids', () => {
    const zh = setup('zh')
    expect(zh.tItem('APR-left-side', 'fallback')).toBe(
      (messages.zh.itemLabels as Record<string, string>)['APR-left-side'],
    )
    expect(zh.tItem('NOPE', '原文')).toBe('原文')
    const en = setup('en')
    expect(en.tItem('APR-left-side', 'x')).toBe(
      (messages.en.itemLabels as Record<string, string>)['APR-left-side'],
    )
  })

  it('tItemText / tItemEvidence / tItemOption overlay English only in en mode', () => {
    const id = Object.keys(ITEM_TEXTS_EN).find((k) => ITEM_TEXTS_EN[k].description)!
    const zh = setup('zh')
    expect(zh.tItemText(id, 'description', '中文')).toBe('中文')
    expect(zh.tItemEvidence(id, 0, '中文')).toBe('中文')
    expect(zh.tItemOption(id, 'normal', '正常')).toBe('正常')

    const en = setup('en')
    expect(en.tItemText(id, 'description', '中文')).toBe(ITEM_TEXTS_EN[id].description)
    expect(en.tItemText('NOPE', 'description', '中文')).toBe('中文')
    expect(en.tItemText(id, 'lockedHint', undefined)).toBe(ITEM_TEXTS_EN[id].lockedHint)

    const evId = Object.keys(ITEM_TEXTS_EN).find((k) => ITEM_TEXTS_EN[k].evidence?.length)!
    expect(en.tItemEvidence(evId, 0, 'x')).toBe(ITEM_TEXTS_EN[evId].evidence![0])
    expect(en.tItemEvidence(evId, 99, 'x')).toBe('x')

    const optId = Object.keys(ITEM_TEXTS_EN).find((k) => ITEM_TEXTS_EN[k].options)!
    const [value, label] = Object.entries(ITEM_TEXTS_EN[optId].options!)[0]
    expect(en.tItemOption(optId, value, 'x')).toBe(label)
    expect(en.tItemOption(optId, 'nope', 'x')).toBe('x')
  })

  it('tCategory translates discussion categories in English only', () => {
    expect(setup('zh').tCategory('保養維修')).toBe('保養維修')
    const en = setup('en')
    expect(en.tCategory('保養維修')).toBe('Maintenance & Repair')
    expect(en.tCategory('購車討論')).toBe('Buying')
    expect(en.tCategory('未知分類')).toBe('未知分類')
  })

  it('tRegion romanizes counties and districts in English', () => {
    expect(setup('zh').tRegion('台北市')).toBe('台北市')
    const en = setup('en')
    expect(en.tRegion('台北市')).toBe('Taipei City')
    expect(en.tRegion('大安區')).toBe("Da'an District")
    expect(en.tRegion('不存在')).toBe('不存在')
    expect(en.tRegion(null)).toBe('')
    expect(en.tRegion(undefined)).toBe('')
  })

  it('tSpec translates spec phrases, longest first', () => {
    expect(setup('zh').tSpec('無段變速')).toBe('無段變速')
    const en = setup('en')
    expect(en.tSpec('CVT 無段變速')).toBe('CVT (automatic)')
    expect(en.tSpec('無段變速')).toBe('CVT (automatic)')
    expect(en.tSpec('沒有外露鏈條')).toBe('No exposed chain')
    expect(en.tSpec('6速手排')).toBe('6-speed manual')
    expect(en.tSpec('Unknown')).toBe('Unknown')
    expect(en.tSpec(null)).toBe('')
  })

  it('formatPrice: $58,000 in zh, NT$ 58,000 in en, blank for null', () => {
    expect(setup('zh').formatPrice(58000)).toBe('$58,000')
    const en = setup('en')
    expect(en.formatPrice(58000)).toBe('NT$ 58,000')
    expect(en.formatPrice(0)).toBe('NT$ 0')
    expect(en.formatPrice(null)).toBe('')
    expect(en.formatPrice(undefined)).toBe('')
  })

  it('formatDate / isEnglish / localeTag', () => {
    const d = new Date(2026, 9, 18, 9, 5)
    const zh = setup('zh')
    expect(zh.isEnglish()).toBe(false)
    expect(zh.localeTag()).toBe('zh-TW')
    expect(zh.formatDate(d)).toBe(d.toLocaleDateString('zh-TW'))
    const en = setup('en')
    expect(en.isEnglish()).toBe(true)
    expect(en.localeTag()).toBe('en-US')
    expect(en.formatDate(d.getTime())).toBe('10/18/2026')
    expect(en.formatDate(d, true)).toContain('09:05')
  })
})
