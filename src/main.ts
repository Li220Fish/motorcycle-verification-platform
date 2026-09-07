import { App as CapacitorApp } from '@capacitor/app'
import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import { platformService } from './services/platform/platform.service'
import { useThemeStore } from './stores/theme.store'
import './style.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

void useThemeStore().initialize()

/**
 * Android hardware back button + system edge-swipe-back gesture: Capacitor's
 * Android runtime does NOT wire this to the webview's history on its own
 * (confirmed — BridgeActivity/Bridge have no back-press handling at all), so
 * without this every back press/gesture just exits the app immediately,
 * from any screen. `history.state.back` is Vue Router's own marker for
 * "there's a previous entry in THIS app's history" (null at the router's
 * first entry) — the documented Capacitor+Vue Router pattern for telling
 * in-app back from "actually leave the app."
 *
 * iOS gets the equivalent native edge-swipe gesture instead via
 * `allowsBackForwardNavigationGestures` on the WKWebView (see
 * ios/App/App/SceneDelegate.swift) — no JS-side handling needed there.
 */
if (platformService.isNative()) {
  CapacitorApp.addListener('backButton', () => {
    if (window.history.state?.back) {
      router.back()
    } else {
      void CapacitorApp.exitApp()
    }
  })
}

// Wait for the router's initial (async) navigation — including the
// `beforeEach` guard's `await authStore.waitUntilReady()` — to resolve
// before mounting. Without this, AppLayout.vue (which renders <RouterView>
// unconditionally, see App.vue) can start rendering on a cold start before
// that guard settles, an intermittent race reproduced on-device: a
// TypeError inside Vue's own runtime-core, only on true cold start, gone
// after a same-session reload. This is Vue Router's own documented fix for
// exactly this class of race (https://router.vuejs.org — "Initial
// Navigation").
router.isReady().then(() => {
  app.mount('#app')
})
