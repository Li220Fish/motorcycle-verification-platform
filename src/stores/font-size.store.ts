import { Preferences } from '@capacitor/preferences'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export type FontSize = 'small' | 'medium' | 'large'

const STORAGE_KEY = 'font-size'

/** 'small' is the app's original, unscaled sizing (every existing px
 *  font-size in the codebase, unchanged) — 'medium'/'large' scale UP from
 *  there via `zoom` on <body> (see style.css), not down, so this never
 *  risks shrinking already-small badge/meta text below readable. `zoom` —
 *  not `transform: scale()` — specifically because it keeps `position:
 *  fixed` elements (BottomNavigation.vue, VerificationLayout.vue's footer)
 *  anchored correctly to the real viewport, the same way a browser's own
 *  ctrl+scroll zoom does; `transform` would detach them. Supported in both
 *  of this app's actual runtime engines (Capacitor Android's Chromium
 *  WebView, and WKWebView/Safari 17+ on iOS). */
function applyToDocument(size: FontSize): void {
  document.documentElement.setAttribute('data-font-size', size)
}

export const useFontSizeStore = defineStore('fontSize', () => {
  const size = ref<FontSize>('small')

  async function initialize(): Promise<void> {
    applyToDocument(size.value)
    const { value } = await Preferences.get({ key: STORAGE_KEY })
    if (value === 'small' || value === 'medium' || value === 'large') {
      size.value = value
      applyToDocument(size.value)
    }
  }

  async function setSize(next: FontSize): Promise<void> {
    size.value = next
    applyToDocument(next)
    await Preferences.set({ key: STORAGE_KEY, value: next })
  }

  return { size, initialize, setSize }
})
