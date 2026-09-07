/**
 * Core Vision v2 AI-vision inspection items (functions/src/ai/prompts/
 * core-vision-v2.ts) — net-new inspection concerns with no checklist itemId
 * of their own, each analyzing one or more of the APR-* photo slots (see
 * functions/src/services/item-evidence-map.ts / evidence-view-map.ts for the
 * backend's authoritative view lists — `aprItemIds` below mirrors those same
 * static relationships client-side, same "stable id, no shared runtime
 * import across the Cloud Functions/web boundary" pattern used elsewhere in
 * this app).
 *
 * Verification v2 migration: superseded the old Group A/B/C (exterior/
 * chassis/engine_powertrain) split — `seat_condition`, both tire conditions,
 * both suspension/brake conditions (except front), `triple_clamp_condition`,
 * `exhaust_condition`, and the engine_left/engine_right-only conditions
 * (tool_mark/paint/intake_manifold/guard) are all retired along with the
 * removed or now-Optional-no-AI photo slots that fed them.
 * `engine_leak_condition`/`engine_external_condition` are renamed to
 * `engine_bottom_leak_condition`/`engine_bottom_external_condition` and
 * narrowed to engine_bottom only (engine_left/engine_right no longer exist).
 *
 * Per user decision (unchanged from v1): these results are NOT a separate
 * "AI 影像判定" report category — each one's verdict/note is merged into the
 * display of the APR-* item(s) whose photo it actually analyzed (see
 * aiVisionItemsForAprItem below, used by VerificationReportView.vue). Only
 * the admin backend (VerifyDetailSection.vue) needs to show which AI
 * category id produced a given verdict, for traceability.
 */
export interface AiVisionItemMeta {
  id: string
  title: string
  /** APR-* checklist item ids whose captured photo this AI item analyzes —
   * usually one, but the 3 "body" items each draw on multiple photos of the
   * same subject. */
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
  { id: 'front_suspension_condition', title: '前避震狀況', aprItemIds: ['APR-front-suspension'] },
  {
    id: 'engine_bottom_leak_condition',
    title: '引擎底部滲漏狀況',
    aprItemIds: ['APR-engine-bottom'],
  },
  {
    id: 'engine_bottom_external_condition',
    title: '引擎底部外觀狀況',
    aprItemIds: ['APR-engine-bottom'],
  },
  {
    id: 'chain_sprocket_condition',
    title: '鏈條與齒盤狀況',
    aprItemIds: ['APR-transmission-chain'],
  },
]

const AI_VISION_ITEM_BY_ID = new Map(AI_VISION_ITEMS.map((item) => [item.id, item]))

export function aiVisionItemTitle(itemId: string): string | undefined {
  return AI_VISION_ITEM_BY_ID.get(itemId)?.title
}

export function aiVisionItemsForAprItem(aprItemId: string): AiVisionItemMeta[] {
  return AI_VISION_ITEMS.filter((item) => item.aprItemIds.includes(aprItemId))
}
