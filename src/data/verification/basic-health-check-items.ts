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
