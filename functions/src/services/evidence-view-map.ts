/**
 * Maps this project's actual photo-slot itemIds (src/data/verification/
 * photo-slots.ts, `APR-<slot>`) to the Routing Map's stable "Evidence View"
 * identifiers. Verification v2 migration: entries for removed steps
 * (license_plate/front_wheel/rear_wheel/engine_left/engine_right/exhaust/
 * chassis_number) and now-Optional-no-AI steps (rear_suspension/front_brake/
 * rear_brake/triple_clamp/seat) are deleted along with them — those views
 * have no AI route left that reads them. This table is the only place the
 * itemId->view mapping is expressed, so a future itemId rename only needs
 * updating here.
 */
export const EVIDENCE_VIEW_MAP: Record<string, string> = {
  'APR-left-side': 'vehicle_left',
  'APR-right-side': 'vehicle_right',
  'APR-dashboard': 'dashboard',
  'APR-rear': 'vehicle_rear',
  'APR-front-suspension': 'front_suspension',
  'APR-engine-bottom': 'engine_bottom',
  'APR-transmission-chain': 'chain_sprocket',
  'APR-modifications': 'modification_evidence',
  // Step 39 (Cold-state eligibility) — not part of the Core Vision v2
  // evidence set, but the same itemId->view mapping convention applies.
  'ENG-02': 'cold_touch',
}

const VIEW_TO_ITEM_ID: Record<string, string> = Object.fromEntries(
  Object.entries(EVIDENCE_VIEW_MAP).map(([itemId, view]) => [view, itemId]),
)

export function viewForItemId(itemId: string): string | undefined {
  return EVIDENCE_VIEW_MAP[itemId]
}

export function itemIdForView(view: string): string | undefined {
  return VIEW_TO_ITEM_ID[view]
}
