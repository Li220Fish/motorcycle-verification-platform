/**
 * Canonical item list for 基本13項健檢 (BasicHealthCheck13.vue) — the single
 * source of truth for each item's `key`/`label`/`required` flag, shared by
 * both the consumer-facing runtime component and the admin health-check
 * anchor annotation tool (src/admin/sections/HealthCheckSection.vue).
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
  { key: 'electrical', label: '電系是否有改裝', required: false },
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
