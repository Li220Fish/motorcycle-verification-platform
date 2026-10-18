import { REGION_NAME_EN } from '@/data/taiwan-regions-en'
import { ITEM_TEXTS_EN } from '@/i18n/item-texts-en'
import { messages } from '@/i18n/messages'
import { useLocaleStore } from '@/stores/locale.store'

type Messages = typeof messages.zh
type Section = keyof Messages

/** `t('nav', 'home')` — section+key is checked against messages.zh's own
 *  shape at compile time (a typo in either argument is a type error, not a
 *  silent blank string at runtime), and reads the locale store's current
 *  `locale` ref on every call, so any component calling `t()` from its
 *  template re-renders automatically when the user switches language.
 *
 *  Optional `params` fills `{name}`-style placeholders in the resolved
 *  string (e.g. a review count, a vehicle name) — needed for the handful of
 *  messages that embed a dynamic value rather than being pure static chrome. */
export function useI18n() {
  const localeStore = useLocaleStore()

  function t<S extends Section>(
    section: S,
    key: keyof Messages[S],
    params?: Record<string, string | number>,
  ): string {
    const dict = messages[localeStore.locale][section] as Record<string, string>
    const template = dict[key as string]
    if (!params) return template
    return template.replace(/\{(\w+)\}/g, (_match, name: string) => String(params[name] ?? ''))
  }

  /**
   * Translates a verification checklist item's title by its stable `id`
   * (e.g. `APR-left-side`, `BASIC-headlight`, `ENG-02`) via the `itemLabels`
   * section, falling back to `fallback` (normally `item.title`, the Chinese
   * string already baked into src/data/verification/*.ts at module-load
   * time) when no translation exists yet. Deliberately non-breaking/
   * incremental this way — the data layer itself stays untouched (it's also
   * read by the admin backend, which is Chinese-only and must keep showing
   * the original label), and a not-yet-covered item id just shows its
   * Chinese title in English mode instead of a blank/missing-key error.
   */
  function tItem(id: string, fallback: string): string {
    const dict = messages[localeStore.locale].itemLabels as Record<string, string>
    return dict[id] ?? fallback
  }

  /** Checklist body text (description/instruction/…) — English overlay from
   *  item-texts-en.ts, Chinese data-layer original otherwise. */
  function tItemText(
    id: string,
    field: 'description' | 'instruction' | 'helpText' | 'lockedHint',
    fallback: string | undefined,
  ): string | undefined {
    if (localeStore.locale !== 'en') return fallback
    return ITEM_TEXTS_EN[id]?.[field] ?? fallback
  }
  function tItemEvidence(
    id: string,
    index: number,
    fallback: string | undefined,
  ): string | undefined {
    if (localeStore.locale !== 'en') return fallback
    return ITEM_TEXTS_EN[id]?.evidence?.[index] ?? fallback
  }
  function tItemOption(id: string, value: string, fallback: string): string {
    if (localeStore.locale !== 'en') return fallback
    return ITEM_TEXTS_EN[id]?.options?.[value] ?? fallback
  }

  /** Discussion categories are stored as their Chinese label. */
  function tCategory(value: string): string {
    return localeStore.locale === 'en' ? (CATEGORY_EN[value] ?? value) : value
  }

  const isEnglish = (): boolean => localeStore.locale === 'en'
  /** BCP-47 tag for Intl/toLocale*String calls. */
  const localeTag = (): string => (isEnglish() ? 'en-US' : 'zh-TW')

  /** 縣市／行政區 names are stored in Chinese on listings (taiwan-regions.ts);
   *  English mode swaps in the romanized name, falling back to the stored text. */
  function tRegion(name: string | null | undefined): string {
    if (!name) return ''
    return isEnglish() ? (REGION_NAME_EN[name] ?? name) : name
  }

  /** Spec-sheet values stored as Chinese text (transmission, body type, power
   *  type…) — admin/catalog data, not user prose, so a small phrase table
   *  covers it. Unknown text passes through unchanged. */
  function tSpec(value: string | null | undefined): string {
    if (!value) return ''
    if (!isEnglish()) return value
    let out = value
    for (const [zh, en] of SPEC_PHRASES_EN) out = out.split(zh).join(en)
    return out.trim()
  }

  /** `NT$ 58,000` in English, `$58,000` in Chinese (the app's existing style). */
  function formatPrice(twd: number | null | undefined): string {
    if (twd == null) return ''
    const amount = twd.toLocaleString(isEnglish() ? 'en-US' : 'zh-TW')
    return isEnglish() ? `NT$ ${amount}` : `$${amount}`
  }

  /** Locale-aware date (+ optional time) for user-facing timestamps. */
  function formatDate(value: number | Date, withTime = false): string {
    const date = value instanceof Date ? value : new Date(value)
    const locale = isEnglish() ? 'en-US' : 'zh-TW'
    return withTime
      ? date.toLocaleString(locale, {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : date.toLocaleDateString(locale)
  }

  return {
    t,
    tItem,
    tItemText,
    tItemEvidence,
    tItemOption,
    tCategory,
    tRegion,
    tSpec,
    formatPrice,
    formatDate,
    isEnglish,
    localeTag,
  }
}

const CATEGORY_EN: Record<string, string> = {
  購車討論: 'Buying',
  賣車討論: 'Selling',
  保養維修: 'Maintenance & Repair',
  車款交流: 'Models',
  騎乘生活: 'Riding Life',
  驗車討論: 'Inspections',
  其他: 'Other',
}

// Longest phrases first so e.g. 「無段變速」 wins over 「變速」.
const SPEC_PHRASES_EN: [string, string][] = [
  ['沒有外露鏈條', 'No exposed chain'],
  ['有外露鏈條', 'Exposed chain'],
  ['CVT 無段變速', 'CVT (automatic)'],
  ['無段變速', 'CVT (automatic)'],
  ['速可達', 'Scooter'],
  ['速克達', 'Scooter'],
  ['打檔車', 'Manual motorcycle'],
  ['檔車', 'Manual motorcycle'],
  ['街車', 'Street bike'],
  ['仿賽', 'Sport bike'],
  ['重機', 'Heavy motorcycle'],
  ['電動車', 'Electric'],
  ['電動', 'Electric'],
  ['汽油', 'Gasoline'],
  ['手排', 'manual'],
  ['自排', 'automatic'],
  ['鏈條傳動', 'Chain drive'],
  ['皮帶傳動', 'Belt drive'],
  ['速', '-speed '],
]
