import { expect, test, type Page } from '@playwright/test'

/**
 * Real MotoBattery_Probe over Web Bluetooth — the deployed web app in the
 * installed Google Chrome, talking to the physical device. Opt-in only:
 *
 *   PROBE_HARDWARE=1 BASE_URL=https://motorcycle-verification.web.app \
 *     npx playwright test tests/e2e/probe-hardware.spec.ts --headed
 *
 * Needs a PC Bluetooth radio switched on and the probe powered on nearby.
 * Chrome's device chooser is answered through CDP's DeviceAccess domain,
 * picking the first device whose name starts with MotoBattery_Probe.
 *
 * With the clips NOT on a battery every stage correctly answers ERROR
 * ("探針未夾緊或斷路"); with them on a 12V battery OCV/IR return values.
 * CRANK only passes on a real engine start, so it isn't asserted beyond a
 * terminal reply.
 */

test.skip(!process.env.PROBE_HARDWARE, 'set PROBE_HARDWARE=1 to run against the real probe')
test.use({ channel: 'chrome' })

async function login(page: Page): Promise<void> {
  await page.goto('/login')
  await page.fill('input[type="email"]', 'agent@test.com')
  await page.fill('input[type="password"]', 'test1234')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard', { timeout: 20000 })
}

test('connects to the real probe from the web app and runs OCV / IR / CHARGE / RESET', async ({
  page,
}) => {
  test.setTimeout(120_000)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('DeviceAccess.enable')
  const offered: string[] = []
  cdp.on(
    'DeviceAccess.deviceRequestPrompted',
    async (event: { id: string; devices: { id: string; name: string }[] }) => {
      offered.push(...event.devices.map((device) => device.name))
      const probe = event.devices.find((device) => device.name.startsWith('MotoBattery_Probe'))
      if (probe) await cdp.send('DeviceAccess.selectPrompt', { id: event.id, deviceId: probe.id })
    },
  )

  await login(page)
  await page.evaluate(() => localStorage.setItem('motoverify:probeMode', 'ble'))
  await page.goto('/probe')
  await expect(page.getByText('實機 Probe（藍牙）')).toBeVisible()
  await page.click('[data-testid="probe-connect"]')
  await expect(page.getByText('Probe 已連線')).toBeVisible({ timeout: 30000 })
  // The chooser only ever offered MotoBattery_Probe* devices.
  expect(offered.length).toBeGreaterThan(0)
  expect(offered.every((name) => name.startsWith('MotoBattery_Probe'))).toBe(true)

  // STATUS → live voltage + clip state.
  await expect(page.locator('[data-testid="probe-live"]')).toBeVisible({ timeout: 8000 })
  await expect(page.locator('[data-testid="probe-clips"]')).toBeVisible()
  const clipsOn = (await page.locator('[data-testid="probe-clips"]').innerText()).includes('已接上')
  const shot = (name: string) =>
    process.env.PROBE_SCREENSHOT_DIR
      ? page.screenshot({ path: `${process.env.PROBE_SCREENSHOT_DIR}/${name}.png`, fullPage: true })
      : Promise.resolve()
  await shot('hw-1-connected')

  for (const stage of ['OCV', 'IR', 'CHARGE'] as const) {
    await page.click(`[data-testid="probe-run-${stage}"]`)
    await expect(page.locator(`[data-testid="probe-run-${stage}"]`)).toBeEnabled({ timeout: 15000 })
  }
  const cards = page.locator('.stage-card')
  if (clipsOn) {
    await expect(cards.nth(0)).toContainText(' V')
    await expect(cards.nth(1)).toContainText('mΩ')
  } else {
    await expect(cards.nth(0)).toContainText('探針未夾緊或斷路')
    await expect(cards.nth(1)).toContainText('探針未連接')
  }

  await shot('hw-2-stages')
  await page.click('.devices-toggle')
  await shot('hw-3-log')
  const tx = await page.locator('.log-list li.tx code').allInnerTexts()
  expect(tx.reverse()).toEqual(['OCV', 'IR', 'CHARGE'])
  await expect(page.locator('.log-list li').filter({ hasText: '"stage":"OCV"' })).toHaveCount(1)

  await page.getByRole('button', { name: '重置裝置' }).click()
  await expect(page.locator('.log-list li').filter({ hasText: 'RESET_OK' })).toHaveCount(1)

  await page.click('[data-testid="probe-disconnect"]')
  await expect(page.locator('.connection-state')).toHaveText('未連接')
})
