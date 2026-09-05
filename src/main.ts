import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import router from './router'
import './style.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

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
