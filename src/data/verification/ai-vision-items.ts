/**
 * Group A/B/C AI-vision inspection items (functions/src/ai/prompts/groups/
 * *.ts) — net-new inspection concerns with no checklist itemId of their own,
 * each analyzing one or more of the 20 real APR-* photo slots (see
 * functions/src/services/item-evidence-map.ts / evidence-view-map.ts for the
 * backend's authoritative view lists — `aprItemIds` below mirrors those same
 * static relationships client-side, same "stable id, no shared runtime
 * import across the Cloud Functions/web boundary" pattern used elsewhere in
 * this app).
 *
 * Per user decision: these results are NOT a separate "AI 影像判定" report
 * category — each one's verdict/note is merged into the display of the
 * APR-* item(s) whose photo it actually analyzed (see
 * aiVisionItemsForAprItem below, used by VerificationReportView.vue). Only
 * the admin backend (VerifyDetailSection.vue) needs to show which AI
 * category id produced a given verdict, for traceability.
 */
export interface AiVisionItemMeta {
  id: string
  title: string
  /** APR-* checklist item ids whose captured photo this AI item analyzes —
   * usually one, but the 3 Group A "body" items and several Group C engine
   * items each draw on multiple photos of the same subject. */
  aprItemIds: string[]
}

export const AI_VISION_ITEMS: AiVisionItemMeta[] = [
  {
    id: 'body_damage',
    title: '車身損傷',
    aprItemIds: ['APR-left-side', 'APR-right-side', 'APR-rear'],
  },
  {
    id: 'paint_condition',
    title: '烤漆狀況',
    aprItemIds: ['APR-left-side', 'APR-right-side', 'APR-rear'],
  },
  {
    id: 'body_alignment_visual',
    title: '車身對稱性',
    aprItemIds: ['APR-left-side', 'APR-right-side', 'APR-rear'],
  },
  { id: 'seat_condition', title: '坐墊狀況', aprItemIds: ['APR-seat'] },
  { id: 'front_tire_condition', title: '前輪胎況', aprItemIds: ['APR-front-wheel'] },
  { id: 'rear_tire_condition', title: '後輪胎況', aprItemIds: ['APR-rear-wheel'] },
  { id: 'front_suspension_condition', title: '前避震狀況', aprItemIds: ['APR-front-suspension'] },
  { id: 'rear_suspension_condition', title: '後避震狀況', aprItemIds: ['APR-rear-suspension'] },
  { id: 'front_brake_condition', title: '前煞車狀況', aprItemIds: ['APR-front-brake'] },
  { id: 'rear_brake_condition', title: '後煞車狀況', aprItemIds: ['APR-rear-brake'] },
  { id: 'triple_clamp_condition', title: '三角台狀況', aprItemIds: ['APR-triple-clamp'] },
  {
    id: 'engine_leak_condition',
    title: '引擎滲漏狀況',
    aprItemIds: ['APR-engine-left', 'APR-engine-right', 'APR-engine-bottom'],
  },
  {
    id: 'engine_external_condition',
    title: '引擎外觀狀況',
    aprItemIds: ['APR-engine-left', 'APR-engine-right', 'APR-engine-bottom'],
  },
  {
    id: 'engine_tool_mark_condition',
    title: '引擎螺絲／工具痕跡',
    aprItemIds: ['APR-engine-left', 'APR-engine-right'],
  },
  {
    id: 'engine_paint_condition',
    title: '引擎烤漆狀況',
    aprItemIds: ['APR-engine-left', 'APR-engine-right'],
  },
  {
    id: 'intake_manifold_condition',
    title: '進氣歧管狀況',
    aprItemIds: ['APR-engine-left', 'APR-engine-right'],
  },
  {
    id: 'engine_guard_condition',
    title: '引擎護蓋狀況',
    aprItemIds: ['APR-engine-left', 'APR-engine-right', 'APR-engine-bottom'],
  },
  {
    id: 'chain_sprocket_condition',
    title: '鏈條與齒盤狀況',
    aprItemIds: ['APR-transmission-chain'],
  },
  { id: 'exhaust_condition', title: '排氣管狀況', aprItemIds: ['APR-exhaust'] },
]

const AI_VISION_ITEM_BY_ID = new Map(AI_VISION_ITEMS.map((item) => [item.id, item]))

export function aiVisionItemTitle(itemId: string): string | undefined {
  return AI_VISION_ITEM_BY_ID.get(itemId)?.title
}

export function aiVisionItemsForAprItem(aprItemId: string): AiVisionItemMeta[] {
  return AI_VISION_ITEMS.filter((item) => item.aprItemIds.includes(aprItemId))
}
