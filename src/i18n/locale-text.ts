import { useLocaleStore } from '@/stores/locale.store'

/** For user-facing text produced outside components (services, stores,
 *  utils) — picks the string for the current locale at call time. */
export function lt(zh: string, en: string): string {
  return useLocaleStore().locale === 'en' ? en : zh
}
