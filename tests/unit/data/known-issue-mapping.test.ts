import { describe, expect, it } from 'vitest'

import { getFlatItems } from '@/data/verification'
import {
  BASIC_HEALTH_CHECK_BASE_ITEMS,
  BASIC_HEALTH_CHECK_CHAIN_ITEM,
} from '@/data/verification/basic-health-check-items'
import {
  KNOWN_ISSUE_PART_APR_ITEM_IDS,
  KNOWN_ISSUE_PART_BASIC_HEALTH_CHECK_KEYS,
  KNOWN_ISSUE_PART_LABEL,
  knownIssuesForAprItem,
  knownIssuesForBasicHealthCheckKey,
} from '@/data/verification/known-issue-mapping'
import type { VehicleModelKnownIssue } from '@/services/firebase/vehicle-model.service'

const PARTS = ['sides', 'rear', 'front_suspension', 'engine_bottom', 'general'] as const
const issues: VehicleModelKnownIssue[] = [
  { id: '1', part: 'sides', description: '側殼易裂' },
  { id: '2', part: 'front_suspension', description: '前叉油封易漏' },
  { id: '3', part: 'engine_bottom', description: '鏈條易鬆' },
  { id: '4', part: 'general', description: '電瓶易沒電' },
  { id: '5', part: 'rear', description: '尾燈易進水' },
]

describe('known-issue mapping tables', () => {
  it('every part has a label and mapping entries', () => {
    for (const part of PARTS) {
      expect(KNOWN_ISSUE_PART_LABEL[part]).toBeTruthy()
      expect(Array.isArray(KNOWN_ISSUE_PART_APR_ITEM_IDS[part])).toBe(true)
      expect(Array.isArray(KNOWN_ISSUE_PART_BASIC_HEALTH_CHECK_KEYS[part])).toBe(true)
    }
  })

  it('mapped APR ids and 12-point keys exist', () => {
    const ids = new Set(getFlatItems('seller').map((f) => f.item.id))
    for (const list of Object.values(KNOWN_ISSUE_PART_APR_ITEM_IDS)) {
      for (const id of list) expect(ids.has(id), id).toBe(true)
    }
    const keys = new Set(
      [...BASIC_HEALTH_CHECK_BASE_ITEMS, BASIC_HEALTH_CHECK_CHAIN_ITEM].map((i) => i.key),
    )
    for (const list of Object.values(KNOWN_ISSUE_PART_BASIC_HEALTH_CHECK_KEYS)) {
      for (const k of list) expect(keys.has(k), k).toBe(true)
    }
  })

  it('"general" never maps to a specific item (shown only on the disclosure screen)', () => {
    expect(KNOWN_ISSUE_PART_APR_ITEM_IDS.general).toEqual([])
    expect(KNOWN_ISSUE_PART_BASIC_HEALTH_CHECK_KEYS.general).toEqual([])
  })
})

describe('knownIssuesForAprItem', () => {
  it('returns the issues whose part covers that photo', () => {
    expect(knownIssuesForAprItem(issues, 'APR-left-side').map((i) => i.id)).toEqual(['1'])
    expect(knownIssuesForAprItem(issues, 'APR-right-side').map((i) => i.id)).toEqual(['1'])
    expect(knownIssuesForAprItem(issues, 'APR-front-suspension-left').map((i) => i.id)).toEqual([
      '2',
    ])
    expect(knownIssuesForAprItem(issues, 'APR-transmission-chain').map((i) => i.id)).toEqual(['3'])
    expect(knownIssuesForAprItem(issues, 'APR-rear').map((i) => i.id)).toEqual(['5'])
  })

  it('returns [] for unrelated items, empty or missing lists', () => {
    expect(knownIssuesForAprItem(issues, 'APR-dashboard')).toEqual([])
    expect(knownIssuesForAprItem([], 'APR-left-side')).toEqual([])
    expect(knownIssuesForAprItem(undefined, 'APR-left-side')).toEqual([])
  })
})

describe('knownIssuesForBasicHealthCheckKey', () => {
  it('maps front suspension → frontshock & triple, drivetrain → chain, rear → taillight', () => {
    expect(knownIssuesForBasicHealthCheckKey(issues, 'frontshock').map((i) => i.id)).toEqual(['2'])
    expect(knownIssuesForBasicHealthCheckKey(issues, 'triple').map((i) => i.id)).toEqual(['2'])
    expect(knownIssuesForBasicHealthCheckKey(issues, 'chain').map((i) => i.id)).toEqual(['3'])
    expect(knownIssuesForBasicHealthCheckKey(issues, 'taillight').map((i) => i.id)).toEqual(['5'])
  })

  it('unmapped keys get nothing', () => {
    expect(knownIssuesForBasicHealthCheckKey(issues, 'seat')).toEqual([])
    expect(knownIssuesForBasicHealthCheckKey(undefined, 'chain')).toEqual([])
  })
})
