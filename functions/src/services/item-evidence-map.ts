/** Item → Evidence View mapping for Core Vision v2 (supersedes the old
 *  GROUP_A/B/C_ITEM_EVIDENCE_VIEWS) — used both to know what to send on a
 *  first analysis pass and, on retry, which OTHER views to send as
 *  unchanged comparison context alongside the one new retake (spec: "新重拍
 *  照片 + 必要的一張比較照" etc, never resend the whole group). */
export const CORE_VISION_V2_ITEM_EVIDENCE_VIEWS: Record<string, string[]> = {
  body_damage: ['vehicle_left', 'vehicle_right', 'vehicle_rear'],
  paint_condition: ['vehicle_left', 'vehicle_right', 'vehicle_rear'],
  body_alignment_visual: ['vehicle_left', 'vehicle_right', 'vehicle_rear'],
  front_suspension_condition: ['front_suspension'],
  engine_bottom_leak_condition: ['engine_bottom'],
  engine_bottom_external_condition: ['engine_bottom'],
  chain_sprocket_condition: ['chain_sprocket'],
}

/** The view a retry's `newEvidenceId` must belong to for a given itemId —
 *  single-view items map 1:1; multi-view items (body_damage etc.) accept the
 *  retake on ANY of their views (the spec doesn't pin retries in those
 *  groups to one specific view, e.g. body_alignment_visual retry evidence
 *  is "新重拍 View + 另一側參考照"). */
export function primaryRetryView(itemEvidenceViews: string[]): string[] {
  return itemEvidenceViews
}
