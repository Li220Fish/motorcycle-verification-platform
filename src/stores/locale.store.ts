import { Preferences } from '@capacitor/preferences'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export type Locale = 'zh' | 'en'

const STORAGE_KEY = 'locale'

function applyToDocument(locale: Locale): void {
  document.documentElement.setAttribute('lang', locale === 'zh' ? 'zh-TW' : 'en')
}

/**
 * Drives src/i18n/messages.ts's lookup (see useI18n composable) — currently
 * only wired into the Settings area (BottomNavigation, SettingsView,
 * PreferencesSettingsView, NotificationSettingsView, AboutView's own row
 * labels) as the first working slice, NOT a full-app translation yet. Every
 * other view's Chinese text is still hardcoded; translating those is a
 * separate, much larger follow-up (this app has 50+ views), not something
 * this store's existence implies is already done.
 */
export const useLocaleStore = defineStore('locale', () => {
  const locale = ref<Locale>('zh')

  async function initialize(): Promise<void> {
    applyToDocument(locale.value)
    const { value } = await Preferences.get({ key: STORAGE_KEY })
    if (value === 'zh' || value === 'en') {
      locale.value = value
      applyToDocument(locale.value)
    }
  }

  async function setLocale(next: Locale): Promise<void> {
    locale.value = next
    applyToDocument(next)
    await Preferences.set({ key: STORAGE_KEY, value: next })
  }

  return { locale, initialize, setLocale }
})
