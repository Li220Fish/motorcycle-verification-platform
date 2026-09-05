/** Item → Evidence View mapping from each Group spec's "Item → Evidence
 *  Mapping" table — used both to know what to send on a first analysis pass
 *  and, on retry, which OTHER views to send as unchanged comparison context
 *  alongside the one new retake (spec: "新重拍照片 + 必要的一張比較照" etc,
 *  never resend the whole group). */
export const GROUP_A_ITEM_EVIDENCE_VIEWS: Record<string, string[]> = {
  body_damage: ['vehicle_left', 'vehicle_right', 'vehicle_rear'],
  paint_condition: ['vehicle_left', 'vehicle_right', 'vehicle_rear'],
  body_alignment_visual: ['vehicle_left', 'vehicle_right', 'vehicle_rear'],
  seat_condition: ['seat'],
}

export const GROUP_B_ITEM_EVIDENCE_VIEWS: Record<string, string[]> = {
  front_tire_condition: ['front_wheel'],
  rear_tire_condition: ['rear_wheel'],
  front_suspension_condition: ['front_suspension'],
  rear_suspension_condition: ['rear_suspension'],
  front_brake_condition: ['front_brake'],
  rear_brake_condition: ['rear_brake'],
  triple_clamp_condition: ['triple_clamp'],
}

export const GROUP_C_ITEM_EVIDENCE_VIEWS: Record<string, string[]> = {
  engine_leak_condition: ['engine_left', 'engine_right', 'engine_bottom'],
  engine_external_condition: ['engine_left', 'engine_right', 'engine_bottom'],
  engine_tool_mark_condition: ['engine_left', 'engine_right'],
  engine_paint_condition: ['engine_left', 'engine_right'],
  intake_manifold_condition: ['engine_left', 'engine_right'],
  engine_guard_condition: ['engine_left', 'engine_right', 'engine_bottom'],
  chain_sprocket_condition: ['chain_sprocket'],
  exhaust_condition: ['exhaust'],
}

/** The view a retry's `newEvidenceId` must belong to for a given itemId —
 *  single-view items map 1:1; multi-view items (body_damage etc.) accept the
 *  retake on ANY of their views (the spec doesn't pin retries in those
 *  groups to one specific view, e.g. body_alignment_visual retry evidence
 *  is "新重拍 View + 另一側參考照"). */
export function primaryRetryView(itemEvidenceViews: string[]): string[] {
  return itemEvidenceViews
}
