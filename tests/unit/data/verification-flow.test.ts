import { describe, expect, it } from 'vitest'

import {
  BUYER_VERIFICATION_SECTIONS,
  findItemById,
  getFlatItems,
  getFlowSections,
  SELLER_VERIFICATION_SECTIONS,
  STANDARD_INSPECTION_OPTIONS,
} from '@/data/verification'
import {
  AI_VISION_ITEMS,
  aiVisionItemsForAprItem,
  aiVisionItemTitle,
} from '@/data/verification/ai-vision-items'
import {
  APPEARANCE_CAPTURE_GROUPS,
  getAppearanceGroup,
  getAppearanceGroupId,
} from '@/data/verification/appearance-groups'
import {
  BASIC_HEALTH_CHECK_BASE_ITEMS,
  BASIC_HEALTH_CHECK_CHAIN_ITEM,
  BASIC_HEALTH_CHECK_ITEM_IDS,
  basicHealthCheckItemId,
  basicHealthCheckItemsFor,
  buildBasicHealthCheckVerificationItems,
  computeHealthCheckAnnotationStatus,
  DEFAULT_HEALTH_CHECK_ANCHORS,
} from '@/data/verification/basic-health-check-items'
import { RESULT_LABEL, RESULT_TONE } from '@/data/verification/result-labels'
import {
  BUYER_APPEARANCE_ITEM_DEFS,
  BUYER_APPEARANCE_ITEM_IDS,
  buyerAppearanceItemId,
} from '@/data/verification/buyer-appearance-items'

const ALL_FLOWS = [
  ['seller', SELLER_VERIFICATION_SECTIONS],
  ['buyer', BUYER_VERIFICATION_SECTIONS],
] as const

const ITEM_TYPES = [
  'check',
  'photo',
  'video',
  'audio',
  'voltage',
  'question',
  'document',
  'ride',
  'form',
  'motion',
  'cold-touch',
]

describe.each(ALL_FLOWS)('%s flow structure', (kind, sections) => {
  const flat = getFlatItems(kind)

  it('getFlowSections returns this flow', () => {
    expect(getFlowSections(kind)).toBe(sections)
  })

  it('has sections, each with an id, title, short description and items', () => {
    expect(sections.length).toBeGreaterThan(0)
    for (const section of sections) {
      expect(section.id).toBeTruthy()
      expect(section.title).toBeTruthy()
      expect(section.shortDescription).toBeTruthy()
      expect(Array.isArray(section.items)).toBe(true)
    }
  })

  it('section ids and item ids are unique', () => {
    const sectionIds = sections.map((s) => s.id)
    expect(new Set(sectionIds).size).toBe(sectionIds.length)
    const itemIds = flat.map((f) => f.item.id)
    expect(new Set(itemIds).size).toBe(itemIds.length)
  })

  it('every item has a title, description and a valid type', () => {
    for (const { item } of flat) {
      expect(item.title, item.id).toBeTruthy()
      expect(item.description, item.id).toBeTruthy()
      expect(ITEM_TYPES, item.id).toContain(item.type)
      expect(typeof item.required, item.id).toBe('boolean')
    }
  })

  it('getFlatItems indexes items 0..n-1 in document order', () => {
    flat.forEach((entry, i) => expect(entry.index).toBe(i))
    const expectedOrder = sections.flatMap((s) => s.items.map((i) => i.id))
    expect(flat.map((f) => f.item.id)).toEqual(expectedOrder)
  })

  it('findItemById finds every item and returns undefined for unknown ids', () => {
    for (const { item } of flat) expect(findItemById(kind, item.id)).toBe(item)
    expect(findItemById(kind, 'NOPE-999')).toBeUndefined()
  })

  it('branch targets and visibleWhen references point at real items', () => {
    const ids = new Set(flat.map((f) => f.item.id))
    for (const { item } of flat) {
      for (const branch of item.branch ?? [])
        expect(ids.has(branch.skipToItemId), item.id).toBe(true)
      if (item.visibleWhen) expect(ids.has(item.visibleWhen.itemId), item.id).toBe(true)
    }
  })

  it('custom answer options only use known values', () => {
    for (const { item } of flat) {
      for (const option of item.options ?? []) {
        expect(['normal', 'attention', 'unsure', 'not_applicable']).toContain(option.value)
        expect(option.label).toBeTruthy()
      }
    }
  })
})

describe('seller vs buyer flows', () => {
  it('buyer flow is exactly 3 sections: 車輛外觀檢測 → 冷車＋引擎 → 熱車', () => {
    expect(BUYER_VERIFICATION_SECTIONS.map((s) => s.id)).toEqual([
      'buyer-appearance',
      'seller-phase3-engine',
      'buyer-hot-check',
    ])
    const buyerItemIds = getFlatItems('buyer').map((f) => f.item.id)
    // 核心照片、其他主動揭露、上路 are gone for buyers
    expect(buyerItemIds.some((id) => id.startsWith('APR-'))).toBe(false)
    expect(buyerItemIds).not.toContain('RIDE-01')
    expect(buyerItemIds).not.toContain('PREP-01')
  })

  it('車輛外觀檢測 = the 7 animated checks followed by the 12-point check', () => {
    const appearance = BUYER_VERIFICATION_SECTIONS[0]
    expect(appearance.title).toBe('車輛外觀檢測')
    const ids = appearance.items.map((i) => i.id)
    expect(ids.slice(0, 7)).toEqual(BUYER_APPEARANCE_ITEM_IDS)
    expect(ids.slice(7)).toEqual(BASIC_HEALTH_CHECK_ITEM_IDS)
    for (const item of appearance.items.slice(0, 7)) {
      expect(item).toMatchObject({ type: 'check', required: true })
    }
  })

  it('the seller flow is unchanged', () => {
    expect(SELLER_VERIFICATION_SECTIONS.map((s) => s.id)).toEqual([
      'seller-phase1-core',
      'seller-phase2-basic-health',
      'seller-phase3-engine',
      'seller-phase4-disclosure',
    ])
  })

  it('every animated appearance item has zh + en text and a working id', () => {
    for (const def of BUYER_APPEARANCE_ITEM_DEFS) {
      for (const text of [def.zh, def.en]) {
        for (const field of ['code', 'title', 'question', 'hint', 'ok', 'bad', 'unsure'] as const)
          expect(text[field], `${def.key}.${field}`).toBeTruthy()
        expect(Object.keys(text.placeholder).sort()).toEqual(['bad', 'ok', 'unsure'])
      }
      expect(findItemById('buyer', buyerAppearanceItemId(def.key))).toBeDefined()
    }
  })

  it('the cold engine section is lockedOrder in both flows', () => {
    for (const sections of [SELLER_VERIFICATION_SECTIONS, BUYER_VERIFICATION_SECTIONS]) {
      expect(sections.find((s) => s.id === 'seller-phase3-engine')?.lockedOrder).toBe(true)
    }
  })

  it('core photo section has the 7 required core photos', () => {
    const core = SELLER_VERIFICATION_SECTIONS.find((s) => s.id === 'seller-phase1-core')!
    const required = core.items.filter((i) => i.type === 'photo' && i.required).map((i) => i.id)
    expect(required).toEqual(
      expect.arrayContaining([
        'APR-left-side',
        'APR-right-side',
        'APR-dashboard',
        'APR-rear',
        'APR-front-suspension-left',
        'APR-front-suspension-right',
        'APR-engine-bottom',
      ]),
    )
  })
})

describe('standard options & result labels', () => {
  it('standard inspection options are normal / attention / unsure', () => {
    expect(STANDARD_INSPECTION_OPTIONS.map((o) => o.value)).toEqual([
      'normal',
      'attention',
      'unsure',
    ])
  })

  it('every answer result has a label and a tone', () => {
    for (const key of ['normal', 'attention', 'unsure', 'not_applicable'] as const) {
      expect(RESULT_LABEL[key]).toBeTruthy()
      expect(['success', 'warning', 'neutral']).toContain(RESULT_TONE[key])
    }
  })
})

describe('AI vision items', () => {
  const sellerIds = new Set(getFlatItems('seller').map((f) => f.item.id))

  it('every analyzed APR id is a real checklist item', () => {
    for (const ai of AI_VISION_ITEMS) {
      expect(ai.title).toBeTruthy()
      for (const id of ai.aprItemIds) expect(sellerIds.has(id), `${ai.id} → ${id}`).toBe(true)
    }
  })

  it('aiVisionItemTitle / aiVisionItemsForAprItem lookups', () => {
    expect(aiVisionItemTitle('body_damage')).toBe('車身損傷（左右側）')
    expect(aiVisionItemTitle('nope')).toBeUndefined()
    expect(aiVisionItemsForAprItem('APR-rear').map((a) => a.id)).toEqual([
      'body_damage_rear',
      'paint_condition_rear',
      'body_alignment_visual',
    ])
    expect(aiVisionItemsForAprItem('APR-dashboard')).toEqual([])
  })
})

describe('appearance capture groups', () => {
  it('ids are unique and lookups round-trip', () => {
    const ids = APPEARANCE_CAPTURE_GROUPS.map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const group of APPEARANCE_CAPTURE_GROUPS) {
      expect(getAppearanceGroup(group.id)).toBe(group)
      for (const itemId of group.itemIds) expect(getAppearanceGroupId(itemId)).toBe(group.id)
    }
  })

  it('unknown ids return null / undefined', () => {
    expect(getAppearanceGroupId('ENG-02')).toBeNull()
    expect(getAppearanceGroup('nope')).toBeUndefined()
  })
})

describe('basic 12-point health check items', () => {
  it('has 12 base items plus a conditional chain item', () => {
    expect(BASIC_HEALTH_CHECK_BASE_ITEMS).toHaveLength(12)
    expect(BASIC_HEALTH_CHECK_CHAIN_ITEM.key).toBe('chain')
  })

  it('basicHealthCheckItemsFor includes the chain only when the bike has one', () => {
    expect(basicHealthCheckItemsFor(true)).toHaveLength(13)
    expect(basicHealthCheckItemsFor(false)).toHaveLength(12)
    expect(basicHealthCheckItemsFor(null)).toHaveLength(12)
    expect(basicHealthCheckItemsFor(undefined)).toHaveLength(12)
  })

  it('item ids are BASIC-prefixed and cover all 13 keys', () => {
    expect(basicHealthCheckItemId('chain')).toBe('BASIC-chain')
    expect(BASIC_HEALTH_CHECK_ITEM_IDS).toHaveLength(13)
    expect(BASIC_HEALTH_CHECK_ITEM_IDS.every((id) => id.startsWith('BASIC-'))).toBe(true)
  })

  it('built VerificationItems are check items with the right descriptions', () => {
    const items = buildBasicHealthCheckVerificationItems()
    expect(items).toHaveLength(13)
    expect(items.every((i) => i.type === 'check')).toBe(true)
    expect(items.find((i) => i.id === 'BASIC-othermod')!.description).toContain('改裝說明')
    expect(items.find((i) => i.id === 'BASIC-headlight')!.required).toBe(true)
  })

  it('default anchors exist for every item, with 0-100 coordinates on page 1 or 2', () => {
    for (const def of basicHealthCheckItemsFor(true)) {
      const anchor = DEFAULT_HEALTH_CHECK_ANCHORS[def.key]
      expect(anchor, def.key).toBeDefined()
      expect(anchor.x).toBeGreaterThanOrEqual(0)
      expect(anchor.x).toBeLessThanOrEqual(100)
      expect(anchor.y).toBeGreaterThanOrEqual(0)
      expect(anchor.y).toBeLessThanOrEqual(100)
      expect([1, 2]).toContain(anchor.page)
    }
  })

  it('computeHealthCheckAnnotationStatus: none / partial / complete', () => {
    expect(computeHealthCheckAnnotationStatus(null, false)).toEqual({
      status: 'none',
      done: 0,
      total: 12,
    })
    expect(
      computeHealthCheckAnnotationStatus({ headlight: { x: 1, y: 1, page: 1 } }, false).status,
    ).toBe('partial')
    expect(computeHealthCheckAnnotationStatus(DEFAULT_HEALTH_CHECK_ANCHORS, true)).toEqual({
      status: 'complete',
      done: 13,
      total: 13,
    })
  })
})
