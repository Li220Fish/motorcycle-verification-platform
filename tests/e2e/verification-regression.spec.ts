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

// Verification no longer requires picking a pre-existing vehicle first —
// picking a type shows a naming step, and naming it creates the vehicle
// behind the scenes. The 45-step checklist has no vehicle-identity form
// step anymore (see the checklist v1 redesign), so brand/model/plate stay
// blank until edited separately — irrelevant to this suite, which only
// exercises the checklist flow itself.
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
  // A freshly-created vehicle has no transmission on file yet, so
  // VehicleTypeGate.vue blocks everything else (including the Hub itself)
  // until 速可達/檔車 is picked — see VerificationStepsView.vue's
  // needsVehicleTypeGate. Fixes the chain/sprocket detection ordering bug
  // (Vehicle.transmission used to only ever get set deep in Phase 3, well
  // after Phase 1's core photos already triggered Core Vision v2). Any
  // choice works for this suite; 檔車 is picked arbitrarily and
  // deterministically.
  const vehicleTypeButton = page.locator('button', { hasText: '檔車' }).first()
  await vehicleTypeButton.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {})
  if (await vehicleTypeButton.isVisible().catch(() => false)) {
    await vehicleTypeButton.click()
    await page.waitForTimeout(300)
  }
  // Guided UI (Task B): /verification/:id now lands on the Section/vehicle-
  // part Hub first, not directly on the item stepper — enter the first
  // section (事前準備, same starting point the old direct-to-stepper flow
  // always landed on) to reach the .tab/category-nav UI the rest of this
  // suite exercises.
  await page.locator('.section-card').first().click()
  await page.waitForTimeout(300)
}

test.describe('Verification engine — freeze-zone regression', () => {
  test('Seller: free-jump across all categories, Engine stays locked', async ({ page }) => {
    await registerAndLogin(page, 'regress-seller')
    await startVerification(page, 'seller', 'Regression Seller')

    // 4 PHASE tabs (Verification v2: 核心照片/燈光電系/冷車＋引擎檢查/其他主動
    // 揭露 — supersedes the old 事前準備/車身外觀/電系狀況/引擎狀況 grouping),
    // always visible, no horizontal overflow
    const tabCount = await page.locator('.tab').count()
    expect(tabCount).toBe(4)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)

    // Free jump: 核心照片 tab (車輛左側 is first in this phase, followed by
    // the rest of the appearance photo items — PREP-03 驗車環境檢測 was
    // removed from the product entirely, no longer opens this phase)
    await page.locator('.tab', { hasText: '核心照片' }).click()
    await page.waitForTimeout(400)
    // Capture Map hub is disabled (2026-09, user requested a straight-through
    // shooting flow instead of a tap-to-select-region hub) — the code still
    // exists, commented out in VerificationStepsView.vue.
    const mapVisible = await page
      .locator('.capture-map')
      .isVisible()
      .catch(() => false)
    expect(mapVisible).toBe(false)
    const coreTitle = await page.locator('h2').first().textContent()
    expect(coreTitle).toBeTruthy()

    // Electrical Quick Check: 9 lights on one screen
    await page.locator('.tab', { hasText: '燈光電系' }).click()
    await page.waitForTimeout(400)
    const lightsVisible = await page
      .locator('.lights-check')
      .isVisible()
      .catch(() => false)
    expect(lightsVisible).toBe(true)
    expect(await page.locator('.quick-btn.ok').count()).toBe(9)

    // Engine section: locked-order badge + Next disabled with zero evidence
    await page.locator('.tab', { hasText: '冷車＋引擎檢查' }).click()
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
    await startVerification(page, 'seller', 'Regression Engine')

    await page.locator('.tab', { hasText: '冷車＋引擎檢查' }).click()
    await page.waitForTimeout(400)

    // Verification v2: 引擎觸感 (ENG-01) moved to PHASE 4 其他主動揭露 (now
    // Optional, spec item 38), so 冷車狀態確認 (ENG-02) is the very FIRST item
    // in this phase — no free item to answer before reaching it.
    const coldCheckTitle = await page.locator('h2').first().textContent()
    expect(coldCheckTitle).toContain('冷車')

    // NOTE (pre-existing, unrelated to Verification v2): ColdTouchCapture.vue
    // is a live getUserMedia camera-preview capture screen with NO file
    // input at all — this test still assumes an older file-upload-based cold
    // check UI. This was already failing before this migration (see prior
    // session notes) and is left as-is; fixing it is a separate, unrelated
    // task from this migration.
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

  test('Onsite (buyer-type) verification entry via the type picker still works', async ({
    page,
  }) => {
    await registerAndLogin(page, 'regress-buyer')

    // Home no longer has its own "開始驗車" quick action (removed as
    // redundant with the bottom-nav 檢驗 tab, which is now the sole entry
    // point) — it lands on the type picker, and the user chooses 買家複驗
    // vs 車輛驗證 themselves.
    await page.goto('/verification')
    // A fixed-delay-then-check was flaky under sequential load (this test's
    // account was just registered, and vehicleStore.fetchVehicles()/
    // loadRecentVerifications() in onMounted can take longer than 500ms
    // against the real project when other tests are also hitting it) —
    // wait for the actual element instead of a guessed delay.
    await expect(page.locator('.type-list')).toBeVisible({ timeout: 10000 })

    await page.locator('.type-card', { hasText: '買家複驗' }).click()
    await page.waitForTimeout(300)
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
    await startVerification(page, 'seller', 'Regression Resume')
    const url = page.url()

    await page.locator('.tab', { hasText: '核心照片' }).click()
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
