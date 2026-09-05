/**
 * Maps this project's actual photo-slot itemIds (src/data/verification/
 * photo-slots.ts, `APR-<slot>`) to the Routing Map's stable "Evidence View"
 * identifiers (routing spec §64: "AI routing 必須依 Evidence View / Item ID
 * 而不是顯示步驟編號"). The 20-item order here matches the routing map's
 * Steps 5-24 table exactly (1:1, already verified by inspection) — this
 * table is the only place that mapping is expressed, so a future itemId
 * rename only needs updating here.
 */
export const EVIDENCE_VIEW_MAP: Record<string, string> = {
  'APR-left-side': 'vehicle_left',
  'APR-right-side': 'vehicle_right',
  'APR-dashboard': 'dashboard',
  'APR-rear': 'vehicle_rear',
  'APR-plate': 'license_plate',
  'APR-front-wheel': 'front_wheel',
  'APR-rear-wheel': 'rear_wheel',
  'APR-front-suspension': 'front_suspension',
  'APR-rear-suspension': 'rear_suspension',
  'APR-front-brake': 'front_brake',
  'APR-rear-brake': 'rear_brake',
  'APR-engine-left': 'engine_left',
  'APR-engine-right': 'engine_right',
  'APR-engine-bottom': 'engine_bottom',
  'APR-transmission-chain': 'chain_sprocket',
  'APR-exhaust': 'exhaust',
  'APR-triple-clamp': 'triple_clamp',
  'APR-seat': 'seat',
  'APR-vin': 'chassis_number',
  'APR-modifications': 'modification_evidence',
  // Step 3 (Environment Calibration) and Step 39 (Cold-state eligibility) —
  // not part of the 20-photo appearance set, but the same itemId->view
  // mapping convention applies (Environment/Cold-State spec §35/§36).
  'PREP-03': 'environment',
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
