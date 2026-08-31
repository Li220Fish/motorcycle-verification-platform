import { getFlatItems } from '@/data/verification'
import { RESULT_LABEL, RESULT_TONE } from '@/data/verification/result-labels'
import type { AnswerResultValue } from '@/types/verification-evidence'
import type { ReportSection } from '@/components/verification/InspectionReportBody.vue'
import type { MockMarketListing } from './marketplace-mock'

/**
 * Every Marketplace listing already claims a passing MotoVerify inspection
 * (see marketplace-mock.ts's header comment) and shows its
 * `verificationScore` as a badge before you ever open the report — this
 * builds the same 5-category/70-item breakdown the real 檢驗報告 screen
 * shows for an actual vehicle (see VerificationReportView.vue), reusing the
 * real Seller flow's item titles/descriptions so the two screens read
 * identically, just fed by fabricated per-item results instead of real
 * verification answers. Deterministic per listing id (not Math.random) so
 * the same listing always shows the same report on reload.
 */

const ATTENTION_NOTES = [
  '外觀有輕微使用痕跡，不影響功能與安全。',
  '零件已接近建議檢查週期，建議近期複檢。',
  '走線／殼件間隙略有鬆動，建議留意。',
  '有輕微油漬／鏽蝕痕跡，尚在可接受範圍。',
]

function seededRandom(seed: string): () => number {
  let state = 0
  for (let i = 0; i < seed.length; i += 1) state = (state * 31 + seed.charCodeAt(i)) >>> 0
  return () => {
    state = (state * 1103515245 + 12345) >>> 0
    return (state >>> 8) / 0x1000000
  }
}

export function buildMockReportSections(listing: MockMarketListing): ReportSection[] {
  const random = seededRandom(listing.id)
  // Higher verificationScore -> fewer items flagged 需要注意.
  const attentionRate = Math.min(0.35, Math.max(0, (100 - listing.verificationScore) / 100) * 0.55)

  const bySection = new Map<
    string,
    { title: string; items: ReportSection['items']; results: AnswerResultValue[] }
  >()

  for (const flat of getFlatItems('seller')) {
    const sectionId = flat.section.id
    if (!bySection.has(sectionId)) {
      bySection.set(sectionId, { title: flat.section.title, items: [], results: [] })
    }
    const bucket = bySection.get(sectionId)!

    const flagged = random() < attentionRate
    const result: AnswerResultValue = flagged ? 'attention' : 'normal'
    bucket.results.push(result)
    bucket.items.push({
      id: flat.item.id,
      title: flat.item.title,
      description: flat.item.description,
      badgeLabel: RESULT_LABEL[result],
      badgeTone: RESULT_TONE[result],
      note: flagged ? ATTENTION_NOTES[Math.floor(random() * ATTENTION_NOTES.length)] : undefined,
    })
  }

  return Array.from(bySection.entries()).map(([sectionId, bucket]) => ({
    id: sectionId,
    title: bucket.title,
    statusLabel: bucket.results.includes('attention') ? '需要注意' : '良好',
    statusTone: bucket.results.includes('attention') ? 'warning' : 'success',
    items: bucket.items,
  }))
}

/** MockMarketListing carries no inspection date — derive a stable one (5–60
 * days before today) so the same listing always shows the same date. */
export function buildMockInspectedDate(listing: MockMarketListing): string {
  const random = seededRandom(`${listing.id}-date`)
  const daysAgo = 5 + Math.floor(random() * 55)
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toLocaleDateString('zh-TW')
}
