import type { VerificationItem } from './verification.types'

/**
 * Canonical item list for 基本12項健檢 (BasicHealthCheck13.vue) — the single
 * source of truth for each item's `key`/`label`/`required` flag, shared by
 * both the consumer-facing runtime component and the admin health-check
 * anchor annotation tool (src/admin/sections/HealthCheckSection.vue).
 *
 * Also the source for this checklist's real VerificationItem entries (see
 * buildBasicHealthCheckVerificationItems below) — it's a real tab/section in
 * seller-verification.ts now, not a standalone Hub-only flow, so each item's
 * saved answer lives at `BASIC-${key}` in the normal answers subcollection
 * alongside every other checklist item.
 *
 * Deliberately does NOT include anchor/page — those are per-vehicle-model
 * data, admin-edited and stored on vehicleModels/{id}.healthCheckAnchors.
 * Keeping key/label/required here means the required-item gating logic in
 * BasicHealthCheck13.vue can never drift out of sync with what the admin
 * annotation tool shows — the admin only ever places/moves a marker for an
 * item that already exists here, never invents or renames one.
 */
export interface BasicHealthCheckItemDef {
  key: string
  label: string
  required: boolean
}

export const BASIC_HEALTH_CHECK_BASE_ITEMS: BasicHealthCheckItemDef[] = [
  { key: 'headlight', label: '大燈', required: true },
  { key: 'turnsignal', label: '方向燈', required: true },
  { key: 'taillight', label: '尾燈', required: true },
  { key: 'seat', label: '坐墊外觀', required: true },
  { key: 'othermod', label: '其他改裝品', required: false },
  { key: 'triple', label: '三角台', required: false },
  { key: 'frontshock', label: '前避震', required: false },
  { key: 'frontbrake', label: '前煞車', required: true },
  { key: 'fronttire', label: '前輪', required: false },
  { key: 'rearbrake', label: '後煞車', required: true },
  { key: 'reartire', label: '後輪', required: false },
  { key: 'rearshock', label: '後避震', required: false },
]

/** Only shown when the vehicle's picked catalog model has 鏈條傳動 = true
 *  (Vehicle.hasChain, set from the picked vehicleModels/{id}). */
export const BASIC_HEALTH_CHECK_CHAIN_ITEM: BasicHealthCheckItemDef = {
  key: 'chain',
  label: '鏈條',
  required: false,
}

export function basicHealthCheckItemsFor(
  hasChain: boolean | null | undefined,
): BasicHealthCheckItemDef[] {
  return hasChain
    ? [...BASIC_HEALTH_CHECK_BASE_ITEMS, BASIC_HEALTH_CHECK_CHAIN_ITEM]
    : BASIC_HEALTH_CHECK_BASE_ITEMS
}

/** This checklist's item ids in the shared verifications/{id}/answers
 *  subcollection — prefixed so they can never collide with an unrelated
 *  PREP/APR/ELEC/ENG id. */
export function basicHealthCheckItemId(key: string): string {
  return `BASIC-${key}`
}

/**
 * Real VerificationItem entries for seller-verification.ts — always includes
 * BASIC-chain (unlike basicHealthCheckItemsFor's hasChain param, which this
 * deliberately does not take): visibility for a transmission-conditional
 * item is decided once, at runtime, by verification.store.ts's
 * isItemVisible (see its hasExposedChainSprocket check) — the exact same
 * pattern APR-transmission-chain already uses — rather than baked into the
 * static section content at module-load time.
 */
export function buildBasicHealthCheckVerificationItems(): VerificationItem[] {
  return [...BASIC_HEALTH_CHECK_BASE_ITEMS, BASIC_HEALTH_CHECK_CHAIN_ITEM].map((def) => ({
    id: basicHealthCheckItemId(def.key),
    title: def.label,
    description:
      def.key === 'othermod'
        ? '基本12項健檢：點擊車輛照片上的標記快速標示，並可補充改裝說明。'
        : '基本12項健檢：點擊車輛照片上的標記快速標示打勾（正常）或打叉（異常）。',
    type: 'check',
    required: def.required,
  }))
}

/** Every item id this checklist can produce, chain included — used by
 *  VerificationStepsView.vue to detect "current item belongs to this
 *  consolidated tap-on-photo group" the same way it does for the other
 *  swapped-in flows (Core Photo / Engine Session / Lights). */
export const BASIC_HEALTH_CHECK_ITEM_IDS: string[] = [
  ...BASIC_HEALTH_CHECK_BASE_ITEMS,
  BASIC_HEALTH_CHECK_CHAIN_ITEM,
].map((def) => basicHealthCheckItemId(def.key))

export interface HealthCheckAnchor {
  x: number
  y: number
  page: 1 | 2
}

/**
 * Fallback anchors for models the admin hasn't annotated yet in
 * HealthCheckSection.vue (vehicleModels/{id}.healthCheckAnchors is unset) —
 * the original hand-placed positions from before per-model annotation
 * existed, matched to BIKE_REFERENCE_PHOTO (basic-health-check-photo.ts).
 * BasicHealthCheck13.vue uses this set *together with* that same default
 * photo, never mixed with a model's own uploaded coverImageUrl — an
 * unannotated model's real photo (if it has one) has no matching
 * coordinates, so showing it here would misplace every marker.
 */
export const DEFAULT_HEALTH_CHECK_ANCHORS: Record<string, HealthCheckAnchor> = {
  headlight: { x: 20.5, y: 38.0, page: 1 },
  turnsignal: { x: 40.0, y: 55.8, page: 1 },
  taillight: { x: 85.0, y: 45.2, page: 1 },
  seat: { x: 51.7, y: 35.7, page: 1 },
  othermod: { x: 58.4, y: 80.0, page: 1 },
  triple: { x: 68.5, y: 53.0, page: 2 },
  frontshock: { x: 66.8, y: 65.0, page: 2 },
  frontbrake: { x: 77.7, y: 79.4, page: 2 },
  fronttire: { x: 70.0, y: 90.0, page: 2 },
  rearbrake: { x: 24.8, y: 60.4, page: 2 },
  reartire: { x: 20.0, y: 77.0, page: 2 },
  rearshock: { x: 20.1, y: 45.8, page: 2 },
  chain: { x: 32.0, y: 70.0, page: 2 },
}

export type HealthCheckAnnotationStatus = 'none' | 'partial' | 'complete'

export function computeHealthCheckAnnotationStatus(
  anchors: Record<string, HealthCheckAnchor> | null | undefined,
  hasChain: boolean | null | undefined,
): { status: HealthCheckAnnotationStatus; done: number; total: number } {
  const items = basicHealthCheckItemsFor(hasChain)
  const done = items.filter((it) => anchors?.[it.key]).length
  const status: HealthCheckAnnotationStatus =
    done === 0 ? 'none' : done === items.length ? 'complete' : 'partial'
  return { status, done, total: items.length }
}
