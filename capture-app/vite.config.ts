import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// RiDE 訓練資料採集 (developer capture app) — a separate Vite app sharing the
// main app's src/ (Firebase init, item definitions) via the same `@` alias.
// Built into its own capture-app/dist (never the main dist/, which Capacitor
// copies into the RiDE app) and deployed to its own Hosting site via
// capture-app/firebase.json, so the consumer app ships none of it.
const certDir = fileURLToPath(new URL('./.cert', import.meta.url))
const https = existsSync(`${certDir}/key.pem`)
  ? { key: readFileSync(`${certDir}/key.pem`), cert: readFileSync(`${certDir}/cert.pem`) }
  : undefined

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: '/capture/',
  envDir: fileURLToPath(new URL('..', import.meta.url)),
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('../src', import.meta.url)),
      '@capture': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: fileURLToPath(new URL('./dist/capture', import.meta.url)),
    emptyOutDir: true,
  },
  server: {
    host: true,
    port: 5180,
    https,
  },
})
