import { fileURLToPath } from 'node:url'
import { defineConfig, mergeConfig } from 'vitest/config'

import viteConfig from './vite.config.ts'

/**
 * Unit tests (tests/unit/**) — `npm test`. Separate from Playwright's
 * tests/e2e (real browser against a running dev server) and from
 * functions/'s own backend tests. Firebase is stubbed out globally in
 * tests/unit/setup.ts, so nothing here ever touches a real project.
 */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'happy-dom',
      include: ['tests/unit/**/*.test.ts'],
      setupFiles: [fileURLToPath(new URL('./tests/unit/setup.ts', import.meta.url))],
      restoreMocks: true,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,vue}'],
        exclude: ['src/**/*.d.ts', 'src/main.ts', 'src/data/dev-log.json', 'src/types/**'],
        reporter: ['text-summary', 'html', 'json-summary'],
        reportsDirectory: 'coverage/unit',
      },
    },
  }),
)
