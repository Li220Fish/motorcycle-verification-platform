/**
 * Capture-Map grouping for the Seller 車身外觀 category (P1 §10 of the UX
 * report: 20 photo items were one-per-page with zero positional guidance).
 * This is a UI-only regrouping — every group's `itemIds` still resolves to
 * the exact same `APR-*` item IDs from `photo-slots.ts`; nothing about the
 * underlying 20-item data model changes. Tapping a location on the map
 * jumps into the normal linear item flow, it doesn't replace it.
 */
export interface AppearanceCaptureGroup {
  id: string
  label: string
  itemIds: string[]
  /** Highlight rect on the shared 300x150 MotorcycleDiagram viewBox. */
  highlight: { x: number; y: number; w: number; h: number }
}

export const APPEARANCE_CAPTURE_GROUPS: AppearanceCaptureGroup[] = [
  {
    id: 'front',
    label: '車頭／儀表板',
    itemIds: ['APR-dashboard'],
    highlight: { x: 225, y: 28, w: 65, h: 50 },
  },
  {
    id: 'rear',
    label: '車尾／車牌',
    itemIds: ['APR-rear', 'APR-plate'],
    highlight: { x: 5, y: 82, w: 45, h: 45 },
  },
  {
    id: 'left-side',
    label: '左側車身',
    itemIds: ['APR-left-side'],
    highlight: { x: 100, y: 42, w: 100, h: 42 },
  },
  {
    id: 'right-side',
    label: '右側車身',
    itemIds: ['APR-right-side'],
    highlight: { x: 100, y: 42, w: 100, h: 42 },
  },
  {
    id: 'front-wheel-group',
    label: '前輪組',
    itemIds: ['APR-front-wheel', 'APR-front-suspension', 'APR-front-brake'],
    highlight: { x: 205, y: 78, w: 80, h: 68 },
  },
  {
    id: 'rear-wheel-group',
    label: '後輪組',
    itemIds: ['APR-rear-wheel', 'APR-rear-suspension', 'APR-rear-brake'],
    highlight: { x: 15, y: 78, w: 80, h: 68 },
  },
  {
    id: 'engine',
    label: '引擎',
    itemIds: [
      'APR-engine-left',
      'APR-engine-right',
      'APR-engine-bottom',
      'APR-transmission-chain',
      'APR-exhaust',
    ],
    highlight: { x: 95, y: 92, w: 110, h: 45 },
  },
  {
    id: 'frame-other',
    label: '車架與其他',
    itemIds: ['APR-triple-clamp', 'APR-seat', 'APR-vin', 'APR-modifications'],
    highlight: { x: 88, y: 38, w: 132, h: 98 },
  },
]

export function getAppearanceGroupId(itemId: string): string | null {
  return APPEARANCE_CAPTURE_GROUPS.find((group) => group.itemIds.includes(itemId))?.id ?? null
}

export function getAppearanceGroup(groupId: string): AppearanceCaptureGroup | undefined {
  return APPEARANCE_CAPTURE_GROUPS.find((group) => group.id === groupId)
}
