import { test, expect, type Page } from '@playwright/test'

/**
 * Proves the Message Center / Discussion Center are real Firebase-backed
 * features, not local mock state: separate browser contexts (separate
 * Auth/localStorage, exactly like two different phones) exchange data
 * through Firestore `onSnapshot` listeners with zero page reloads.
 *
 * Requires the 3 seeded dev/QA test accounts (scripts/seed-test-users.mjs)
 * and demo data (scripts/seed-demo-data.mjs) — in particular the seeded
 * Buyer<->Seller "交易中" conversation — to already exist in the target
 * Firebase project.
 */

async function quickLogin(page: Page, label: string) {
  await page.goto('/login')
  await page.locator('.quick-login-btn', { hasText: label }).click()
  await page.waitForURL('**/dashboard', { timeout: 15000 })
  await page.waitForTimeout(500)
}

test.describe('Message Center — real-time cross-context', () => {
  test('Buyer message delivers live to Seller, unread badge updates then clears on read', async ({
    browser,
  }) => {
    const buyerCtx = await browser.newContext()
    const sellerCtx = await browser.newContext()
    const buyerPage = await buyerCtx.newPage()
    const sellerPage = await sellerCtx.newPage()

    await quickLogin(buyerPage, '測試買家')
    await quickLogin(sellerPage, '測試賣家')

    // Seller sits on /dashboard (NOT /messages) — the badge must come from
    // AppLayout's app-wide subscription, not a page-local one.
    await sellerPage.goto('/dashboard')
    await sellerPage.waitForTimeout(800)

    await buyerPage.goto('/messages')
    await buyerPage.waitForTimeout(800)
    await buyerPage.locator('.chip', { hasText: '交易中' }).click()
    await buyerPage.waitForTimeout(400)
    await buyerPage.locator('.row-btn').first().click()
    await buyerPage.waitForURL(/\/messages\/[^/]+$/, { timeout: 10000 })
    await buyerPage.waitForTimeout(500)
    const conversationId = buyerPage.url().split('/messages/')[1]

    const uniqueText = `即時同步測試訊息 ${Date.now()}`
    await buyerPage.fill('input[placeholder="輸入訊息..."]', uniqueText)
    await buyerPage.locator('.send-button').click()
    await expect(buyerPage.locator('.bubble.mine', { hasText: uniqueText })).toBeVisible({
      timeout: 10000,
    })

    // Live delivery, no reload on seller's side.
    await sellerPage.waitForTimeout(1500)
    const badge = sellerPage.locator('.bottom-nav .nav-item', { hasText: '訊息' }).locator('.badge')
    await expect(badge).toBeVisible({ timeout: 10000 })
    const badgeCount = Number(await badge.textContent())
    expect(badgeCount).toBeGreaterThan(0)

    await sellerPage.goto(`/messages/${conversationId}`)
    await expect(sellerPage.locator('.bubble.them', { hasText: uniqueText })).toBeVisible({
      timeout: 10000,
    })
    await sellerPage.waitForTimeout(1000) // let markCurrentConversationRead() fire

    await sellerPage.goto('/dashboard') // chat room hides chrome; leave it to see the nav again
    await sellerPage.waitForTimeout(800)
    await expect(
      sellerPage.locator('.bottom-nav .nav-item', { hasText: '訊息' }).locator('.badge'),
    ).toHaveCount(0)
  })
})

test.describe('Discussion Center — real-time cross-context', () => {
  test('Buyer post -> Seller like -> Dealer comment all appear live for Buyer without reload', async ({
    browser,
  }) => {
    const buyerCtx = await browser.newContext()
    const sellerCtx = await browser.newContext()
    const dealerCtx = await browser.newContext()
    const buyerPage = await buyerCtx.newPage()
    const sellerPage = await sellerCtx.newPage()
    const dealerPage = await dealerCtx.newPage()

    await quickLogin(buyerPage, '測試買家')
    await quickLogin(sellerPage, '測試賣家')
    await quickLogin(dealerPage, 'MotoVerify 車商')

    const title = `即時同步貼文 ${Date.now()}`
    await buyerPage.goto('/discussion/compose')
    await buyerPage.waitForTimeout(400)
    await buyerPage.fill('input[maxlength="80"]', title)
    await buyerPage.fill(
      'textarea[maxlength="5000"]',
      '這是一篇用來驗證即時同步的測試貼文，內容僅供 QA 使用。',
    )
    await buyerPage.locator('button', { hasText: '發布討論' }).click()
    await buyerPage.waitForURL(/\/discussion\/[^/]+$/, { timeout: 10000 })
    await buyerPage.waitForTimeout(500)
    const postId = buyerPage.url().split('/discussion/')[1]

    const likeButton = buyerPage.locator('.like-btn')
    const likeCountBefore = Number((await likeButton.textContent())?.trim().split(/\s+/).pop())

    await sellerPage.goto(`/discussion/${postId}`)
    await sellerPage.waitForTimeout(500)
    await sellerPage.locator('.like-btn').click()

    await expect
      .poll(async () => Number((await likeButton.textContent())?.trim().split(/\s+/).pop()), {
        timeout: 10000,
      })
      .toBe(likeCountBefore + 1)

    const commentText = `即時同步留言 ${Date.now()}`
    await dealerPage.goto(`/discussion/${postId}`)
    await dealerPage.waitForTimeout(500)
    await dealerPage.fill('input[placeholder="留下你的想法..."]', commentText)
    await dealerPage.locator('.send-btn').click()
    await expect(dealerPage.locator('.comments', { hasText: commentText })).toBeVisible({
      timeout: 10000,
    })

    // Buyer never reloaded /discussion/{postId} — comment must arrive live.
    await expect(buyerPage.locator('.comments', { hasText: commentText })).toBeVisible({
      timeout: 10000,
    })
  })
})
