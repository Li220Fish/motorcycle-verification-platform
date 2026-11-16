import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

// Standalone app: never imports from the RiDE app's src/. Firebase config
// comes from the repository's .env.staging (same test project, own
// engineLine* collections — see mini-apps/README.md).
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  envDir: fileURLToPath(new URL('../../..', import.meta.url)),
  plugins: [vue()],
  resolve: {
    alias: { '@el': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: { outDir: 'dist', emptyOutDir: true },
  test: { environment: 'happy-dom', include: ['tests/**/*.test.ts'] },
})
