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

  return { t }
}
