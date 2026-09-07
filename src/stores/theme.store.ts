import { Preferences } from '@capacitor/preferences'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'theme-mode'
const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

function resolve(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'system' ? (darkMediaQuery.matches ? 'dark' : 'light') : mode
}

function applyToDocument(mode: ThemeMode): void {
  document.documentElement.setAttribute('data-theme', resolve(mode))
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>('system')

  /** Applies the system-preference guess synchronously (no flash while the
   *  persisted choice loads), then swaps in the saved value once read. */
  async function initialize(): Promise<void> {
    applyToDocument(mode.value)
    darkMediaQuery.addEventListener('change', () => {
      if (mode.value === 'system') applyToDocument(mode.value)
    })

    const { value } = await Preferences.get({ key: STORAGE_KEY })
    if (value === 'light' || value === 'dark' || value === 'system') {
      mode.value = value
      applyToDocument(mode.value)
    }
  }

  async function setMode(next: ThemeMode): Promise<void> {
    mode.value = next
    applyToDocument(next)
    await Preferences.set({ key: STORAGE_KEY, value: next })
  }

  return { mode, initialize, setMode }
})
