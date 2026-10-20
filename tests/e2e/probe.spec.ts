import { expect, test, type Page } from '@playwright/test'

/**
 * Probe end-to-end on the WEB build (BASE_URL, e.g. the staging hosting):
 *   1. /probe in real-BLE mode asks Web Bluetooth for MotoBattery_Probe* only
 *      (navigator.bluetooth is stubbed — a real chooser can't be automated).
 *   2. /probe in simulated mode runs all four firmware stages over the same
 *      sender code path the real probe uses.
 *   3. With the probe connected, opening a verification asks "要使用 Probe 嗎？".
 *
 * Uses the dedicated automation account (agent@test.com, see LoginView.vue's
 * quick-login list) so no throwaway accounts are created.
 */

const SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e'
/** An in-progress seller verification owned by agent@test.com on staging. */
const VERIFICATION_ID = process.env.PROBE_E2E_VERIFICATION_ID ?? '30YrLI7OEPAB3jmPbmCq'

async function login(page: Page): Promise<void> {
  await page.goto('/login')
  await page.fill('input[type="email"]', 'agent@test.com')
  await page.fill('input[type="password"]', 'test1234')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard', { timeout: 20000 })
}

/** In-app navigation — a page.goto() would reload and drop the BLE link. */
async function navigate(page: Page, path: string): Promise<void> {
  await page.evaluate((target) => {
    const app = (
      document.querySelector('#app') as unknown as {
        __vue_app__: {
          config: { globalProperties: { $router: { push(p: string): Promise<void> } } }
        }
      }
    ).__vue_app__
    return app.config.globalProperties.$router.push(target)
  }, path)
  await page.waitForTimeout(400)
}

test.describe('Probe (web)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const calls: unknown[] = []
      ;(window as unknown as { __bleCalls: unknown[] }).__bleCalls = calls
      Object.defineProperty(navigator, 'bluetooth', {
        configurable: true,
        value: {
          getAvailability: async () => true,
          requestDevice: async (options: unknown) => {
            calls.push(options)
            throw new DOMException('User cancelled the requestDevice() chooser.', 'NotFoundError')
          },
        },
      })
    })
    await login(page)
  })

  test('real mode filters the chooser to MotoBattery_Probe and a cancel shows no error', async ({
    page,
  }) => {
    await navigate(page, '/probe')
    await page.evaluate(() => localStorage.setItem('motoverify:probeMode', 'ble'))
    await page.reload()
    await page.waitForSelector('[data-testid="probe-connect"]')
    await expect(page.getByText('實機 Probe（藍牙）')).toBeVisible()
    await page.click('[data-testid="probe-connect"]')
    await page.waitForTimeout(500)
    const calls = await page.evaluate(
      () => (window as unknown as { __bleCalls: unknown[] }).__bleCalls,
    )
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({
      filters: [{ namePrefix: 'MotoBattery_Probe' }],
      optionalServices: [SERVICE_UUID],
    })
    await expect(page.getByText('未連接')).toBeVisible()
    await expect(page.locator('.error')).toHaveCount(0)
  })

  test('simulated probe: connect, run every stage, read the log, then the verification prompt', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await navigate(page, '/probe')
    if (await page.getByText('實機 Probe（藍牙）').isVisible()) {
      await page.click('.mode-toggle')
    }
    await expect(page.getByText('模擬 Probe（開發測試用）')).toBeVisible()
    await page.click('[data-testid="probe-connect"]')
    await expect(page.getByText('Probe 已連線')).toBeVisible()

    for (const [stage, wait] of [
      ['OCV', 1000],
      ['IR', 1000],
      ['CRANK', 4000],
      ['CHARGE', 9000],
    ] as const) {
      await page.click(`[data-testid="probe-run-${stage}"]`)
      if (stage === 'CRANK')
        await expect(page.getByText('請於 10 秒內按下機車啟動按鈕')).toBeVisible()
      await page.waitForTimeout(wait)
    }
    const cards = page.locator('.stage-card')
    await expect(cards).toHaveCount(4)
    for (const text of ['V', 'mΩ'])
      await expect(cards.filter({ hasText: text }).first()).toBeVisible()
    await expect(page.locator('.stage-card.good, .stage-card.warning')).toHaveCount(4)

    if (process.env.PROBE_SCREENSHOT_DIR)
      await page.screenshot({
        path: `${process.env.PROBE_SCREENSHOT_DIR}/mock-1-stages.png`,
        fullPage: true,
      })
    await page.click('.devices-toggle')
    await expect(page.locator('.log-list li.tx')).toHaveCount(4)
    await expect(
      page.locator('.log-list li').filter({ hasText: '"stage":"CHARGE","status":"OK"' }),
    ).toHaveCount(1)

    // An unfinished verification of the agent account — probe still connected.
    await navigate(page, `/verification/${VERIFICATION_ID}`)
    await page.waitForURL(/\/verification\/[^/]+$/, { timeout: 15000 })
    const skipTour = page.locator('button', { hasText: '略過導覽' })
    if (await skipTour.isVisible({ timeout: 3000 }).catch(() => false)) await skipTour.click()
    const manual = page.locator('button', { hasText: '檔車' }).first()
    if (await manual.isVisible({ timeout: 3000 }).catch(() => false)) await manual.click()

    await expect(page.getByText('要使用 Probe 量測電瓶嗎？')).toBeVisible({ timeout: 10000 })
    if (process.env.PROBE_SCREENSHOT_DIR)
      await page.screenshot({ path: `${process.env.PROBE_SCREENSHOT_DIR}/mock-2-prompt.png` })
    await page.click('[data-testid="probe-prompt-yes"]')
    await expect(page.getByText('要使用 Probe 量測電瓶嗎？')).toHaveCount(0)
    const choice = await page.evaluate(
      (id) => localStorage.getItem(`motoverify:probeUse:${id}`),
      VERIFICATION_ID,
    )
    expect(choice).toBe('yes')
  })
})
