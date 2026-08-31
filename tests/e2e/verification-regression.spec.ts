import { test, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Freeze-zone safety net (see §2-3 of the Firebase/Chat/Discussion migration
 * spec). This locks down the CURRENT behavior of the Seller/Buyer
 * Verification engine before any Home/Nav/Firebase-social work begins.
 * If any assertion here regresses, the migration broke Verification and
 * must be treated as a hard failure regardless of what else shipped.
 */

async function registerAndLogin(page: import('@playwright/test').Page, emailPrefix: string) {
  const email = `${emailPrefix}-${Date.now()}@example.com`
  await page.goto('/login')
  await page.click('text=註冊')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', 'TestPass123!')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard', { timeout: 15000 })
  await page.waitForTimeout(500)
  return email
}

async function pickRole(page: import('@playwright/test').Page, role: '我是買家' | '我是賣家') {
  const roleCard = page.locator('.role-card', { hasText: role })
  if (await roleCard.isVisible().catch(() => false)) {
    await roleCard.click()
    await page.waitForTimeout(500)
  }
}

// Verification no longer requires picking a pre-existing vehicle first —
// picking a type shows a naming step, and naming it creates the vehicle
// behind the scenes (its real details get captured by the flow's own
// PREP-01 step). See the Verification entry-flow redesign.
async function startVerification(
  page: import('@playwright/test').Page,
  type: 'seller' | 'buyer',
  name: string,
) {
  await page.goto(`/verification?type=${type}`)
  await page.waitForTimeout(500)
  await page.fill('input[placeholder*="小紅"]', name)
  await page
    .locator('button', { hasText: /^開始$/ })
    .first()
    .click()
  await page.waitForURL(/\/verification\/[^/]+$/, { timeout: 10000 })
  await page.waitForTimeout(500)
}

test.describe('Verification engine — freeze-zone regression', () => {
  test('Seller: free-jump across first 4 categories, Engine stays locked', async ({ page }) => {
    await registerAndLogin(page, 'regress-seller')
    await pickRole(page, '我是賣家')
    await startVerification(page, 'seller', 'Regression Seller')

    // 5 category tabs, always visible, no horizontal overflow
    const tabCount = await page.locator('.tab').count()
    expect(tabCount).toBe(5)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)

    // Free jump: 事前準備 -> 車身外觀 directly, without walking through 車輛檢查
    await page.locator('.tab', { hasText: '車身外觀' }).click()
    await page.waitForTimeout(400)
    // Capture Map hub first, not straight into a one-per-page photo item
    // (P1 §10 of the UX report) — the 20 underlying items are unchanged,
    // reachable by tapping a location group.
    const mapVisible = await page
      .locator('.capture-map')
      .isVisible()
      .catch(() => false)
    expect(mapVisible).toBe(true)
    await page.locator('.group-row').first().click()
    await page.waitForTimeout(400)
    const exteriorTitle = await page.locator('h2').first().textContent()
    expect(exteriorTitle).toBeTruthy()
    // Exterior Photo Mission: pure-photo items, capture-button present
    const captureButton = page.locator('button.capture-button', { hasText: /^請拍攝：/ })
    expect(await captureButton.count()).toBeGreaterThan(0)

    // Electrical Quick Check: 9 lights on one screen
    await page.locator('.tab', { hasText: '電系狀況' }).click()
    await page.waitForTimeout(400)
    const lightsVisible = await page
      .locator('.lights-check')
      .isVisible()
      .catch(() => false)
    expect(lightsVisible).toBe(true)
    expect(await page.locator('.quick-btn.ok').count()).toBe(9)

    // Engine section: locked-order badge + Next disabled with zero evidence
    await page.locator('.tab', { hasText: '引擎狀況' }).click()
    await page.waitForTimeout(400)
    const lockedHint = await page
      .locator('text=依序完成，不可跳步')
      .isVisible()
      .catch(() => false)
    expect(lockedHint).toBe(true)

    const nextBtn = page.locator('.footer button').last()
    const titleBefore = await page.locator('h2').first().textContent()
    for (let i = 0; i < 4; i++) {
      await nextBtn.click({ force: true }).catch(() => {})
      await page.waitForTimeout(150)
    }
    const titleAfter = await page.locator('h2').first().textContent()
    expect(titleAfter).toBe(titleBefore) // spamming Next with zero evidence must not advance
    expect(await nextBtn.isDisabled()).toBe(true)
  })

  test('Seller: Engine evidence gate unlocks once required evidence exists', async ({ page }) => {
    await registerAndLogin(page, 'regress-engine')
    await pickRole(page, '我是賣家')
    await startVerification(page, 'seller', 'Regression Engine')

    await page.locator('.tab', { hasText: '引擎狀況' }).click()
    await page.waitForTimeout(400)

    for (let i = 0; i < 7; i++) {
      await page
        .locator('.option', { hasText: '正常' })
        .first()
        .click()
        .catch(() => {})
      await page.waitForTimeout(100)
      const nextBtn = page.locator('.footer button').last()
      if (!(await nextBtn.isDisabled())) await nextBtn.click()
      await page.waitForTimeout(150)
    }
    const coldCheckTitle = await page.locator('h2').first().textContent()
    expect(coldCheckTitle).toContain('冷車')

    const videoInput = page.locator('input[type="file"][accept*="video"]').first()
    await videoInput.setInputFiles(path.resolve(__dirname, 'fixtures/fixture-video.mp4'))
    await page.waitForTimeout(400)
    await page
      .locator('button', { hasText: /確認影片/ })
      .first()
      .click()
    await page
      .locator('button', { hasText: /確認影片|儲存中/ })
      .first()
      .waitFor({ state: 'detached', timeout: 15000 })
      .catch(() => {})
    await page.locator('.option', { hasText: '完全冷' }).first().click()
    await page.waitForTimeout(300)

    const nextBtn = page.locator('.footer button').last()
    expect(await nextBtn.isDisabled()).toBe(false)
    await nextBtn.click()
    await page.waitForTimeout(300)
    const afterTitle = await page.locator('h2').first().textContent()
    expect(afterTitle).not.toBe(coldCheckTitle)
  })

  test('Buyer: onsite verification entry and preset-type flow still work', async ({ page }) => {
    await registerAndLogin(page, 'regress-buyer')
    await pickRole(page, '我是賣家')

    // Buyer's own "開始驗車" quick action must reach the same underlying
    // VerificationView, preset to type=buyer, skipping the type picker.
    // Role switching lives in Settings, not a Header Mode Pill (P0
    // CONFIRMED-001 of the UX report) — same RoleSwitcher sheet, new entry
    // point.
    await page.goto('/settings')
    await page.waitForTimeout(400)
    await page.locator('.section-row', { hasText: '使用模式' }).click()
    await page.waitForTimeout(300)
    await page.locator('.sheet-option .option-title', { hasText: /^買家$/ }).click()
    await page.waitForTimeout(300)
    await page.goto('/dashboard')
    await page.waitForTimeout(500)
    await page.locator('.action-card', { hasText: '開始驗車' }).click()
    await page.waitForURL(/\/verification\?type=buyer/, { timeout: 5000 })
    await page.waitForTimeout(400)

    const typeListVisible = await page
      .locator('.type-list')
      .isVisible()
      .catch(() => false)
    expect(typeListVisible).toBe(false)
    const presetVisible = await page
      .locator('.preset-summary')
      .isVisible()
      .catch(() => false)
    expect(presetVisible).toBe(true)

    // Naming step, not a vehicle picker — naming it creates the vehicle.
    await page.fill('input[placeholder*="小紅"]', 'Regression Buyer Target')
    await page
      .locator('button', { hasText: /^開始$/ })
      .first()
      .click()
    await page.waitForURL(/\/verification\/[^/]+$/, { timeout: 10000 })
    const onSteps = /\/verification\/[^/]+$/.test(page.url())
    expect(onSteps).toBe(true)
  })

  test('Resume restores the exact last-visited item after reload', async ({ page }) => {
    await registerAndLogin(page, 'regress-resume')
    await pickRole(page, '我是賣家')
    await startVerification(page, 'seller', 'Regression Resume')
    const url = page.url()

    await page.locator('.tab', { hasText: '車輛檢查' }).click()
    await page.waitForTimeout(300)
    await page.locator('.item-toggle').click()
    await page.waitForTimeout(200)
    const rows = await page.locator('.item-row .row-title').allTextContents()
    const target = rows[Math.floor(rows.length / 2)]
    await page.locator('.item-row', { hasText: target }).click()
    await page.waitForTimeout(300)
    const beforeReload = await page.locator('h2').first().textContent()

    await page.goto(url)
    await page.waitForTimeout(800)
    const afterReload = await page.locator('h2').first().textContent()
    expect(afterReload).toBe(beforeReload)
  })
})
