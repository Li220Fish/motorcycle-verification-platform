import { defineConfig, devices } from '@playwright/test'

/**
 * E2E config. Tests assume a dev server is already running at BASE_URL
 * (npm run dev -- --port 5174) — they are NOT wired to auto-start one,
 * since several suites need multiple independent browser contexts against
 * the same live Firebase project (see tests/e2e/social-realtime.spec.ts).
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:5174',
    viewport: { width: 390, height: 844 },
    screenshot: 'only-on-failure',
  },
  // devices['Desktop Chrome'] carries its own viewport, which otherwise
  // silently overrides the 390x844 mobile viewport above — pin it back so
  // every spec actually runs at mobile width, not desktop.
  projects: [
    {
      name: 'mobile-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } },
    },
  ],
})
