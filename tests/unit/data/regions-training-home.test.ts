import { describe, expect, it } from 'vitest'

import { MOCK_FEATURED_DEALERS } from '@/data/home/featured-dealers-mock'
import { MOCK_MARKET_LISTINGS, resolveAvailableSlots } from '@/data/home/marketplace-mock'
import {
  buildMockInspectedDate,
  buildMockReportSections,
} from '@/data/home/marketplace-report-mock'
import { MOCK_VEHICLE_NEWS } from '@/data/home/vehicle-news-mock'
import { REGION_NAME_EN } from '@/data/taiwan-regions-en'
import { districtsForRegion, TAIWAN_REGIONS } from '@/data/taiwan-regions'
import {
  findTrainingShot,
  GUIDE_VIEW_H,
  GUIDE_VIEW_W,
  guessVehicleType,
  guideAnnotationsFor,
  guideToObb,
  partClassIndex,
  partLabel,
  shotApplies,
  shotGuides,
  TRAINING_PART_LABELS,
  TRAINING_SHOTS,
  trainingShotsFor,
} from '@/data/training/training-shots'

describe('Taiwan regions', () => {
  it('has the 22 counties/cities, each with districts', () => {
    expect(TAIWAN_REGIONS).toHaveLength(22)
    for (const region of TAIWAN_REGIONS) expect(region.districts.length).toBeGreaterThan(0)
  })

  it('districtsForRegion returns the list, [] for unknown', () => {
    expect(districtsForRegion('台北市')).toContain('大安區')
    expect(districtsForRegion('火星市')).toEqual([])
  })

  it('every county/city and district has an English name', () => {
    for (const region of TAIWAN_REGIONS) {
      expect(REGION_NAME_EN[region.name], region.name).toBeTruthy()
      for (const d of region.districts) {
        expect(REGION_NAME_EN[d], d).toBeTruthy()
        expect(REGION_NAME_EN[d]).toMatch(/(District|Township|City)$/)
      }
    }
  })

  it('uses official spellings for well-known names', () => {
    expect(REGION_NAME_EN['台北市']).toBe('Taipei City')
    expect(REGION_NAME_EN['新竹市']).toBe('Hsinchu City')
    expect(REGION_NAME_EN['淡水區']).toBe('Tamsui District')
    expect(REGION_NAME_EN['大安區']).toBe("Da'an District")
  })
})

describe('training shots', () => {
  const bike = { hasChain: true, brakes: { front: 'disc', rear: 'disc' } } as never
  const chainless = { hasChain: false, brakes: { front: 'disc', rear: 'disc' } } as never

  it('shot ids are unique', () => {
    const ids = TRAINING_SHOTS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('findTrainingShot', () => {
    expect(findTrainingShot(TRAINING_SHOTS[0].id)).toBe(TRAINING_SHOTS[0])
    expect(findTrainingShot('nope')).toBeUndefined()
  })

  it('chain-only shots are dropped for chainless bikes', () => {
    for (const s of TRAINING_SHOTS.filter((shot) => shot.chainOnly)) {
      expect(shotApplies(s, chainless)).toBe(false)
      expect(shotApplies(s, bike)).toBe(true)
    }
    expect(trainingShotsFor(chainless).some((s) => s.chainOnly)).toBe(false)
  })

  it('mirrored shots flip x around the guide width', () => {
    const mirrored = TRAINING_SHOTS.find((s) => s.mirror)
    expect(mirrored).toBeDefined()
    const raw = mirrored!.guides.scooter
    const flipped = shotGuides(mirrored!, 'scooter')
    raw.forEach((g, i) => expect(flipped[i].cx).toBe(GUIDE_VIEW_W - g.cx))
  })

  it('guideToObb normalises rects and circles, ignores dots', () => {
    expect(guideToObb({ kind: 'rect', cx: 150, cy: 200, w: 30, h: 40, a: 15 } as never)).toEqual({
      cx: 0.5,
      cy: 0.5,
      w: 30 / GUIDE_VIEW_W,
      h: 40 / GUIDE_VIEW_H,
      angle: 15,
    })
    expect(guideToObb({ kind: 'circle', cx: 0, cy: 0, r: 15 } as never)).toEqual({
      cx: 0,
      cy: 0,
      w: 30 / GUIDE_VIEW_W,
      h: 30 / GUIDE_VIEW_H,
      angle: 0,
    })
    expect(guideToObb({ kind: 'dot', cx: 1, cy: 1, text: 'x' } as never)).toBeNull()
  })

  it('guideAnnotationsFor only returns labelled boxes with known class labels', () => {
    for (const shot of TRAINING_SHOTS) {
      for (const type of ['scooter', 'manual'] as const) {
        for (const a of guideAnnotationsFor(shot, type)) {
          expect(partClassIndex(a.label), `${shot.id}/${a.label}`).toBeGreaterThanOrEqual(0)
          expect(a.box.cx).toBeGreaterThanOrEqual(0)
          expect(a.box.cx).toBeLessThanOrEqual(1)
        }
      }
    }
  })

  it('part labels: 13 classes, triple renamed for training, unknown passes through', () => {
    expect(TRAINING_PART_LABELS).toHaveLength(13)
    expect(partLabel('triple')).toBe('下三角台')
    expect(partLabel('nope')).toBe('nope')
    expect(partClassIndex('nope')).toBe(-1)
  })

  it('guessVehicleType', () => {
    expect(guessVehicleType('速克達', true)).toBe('scooter')
    expect(guessVehicleType('電動車', false)).toBe('scooter')
    expect(guessVehicleType('街車', false)).toBe('manual')
    expect(guessVehicleType('Sport', false)).toBe('manual')
    expect(guessVehicleType(null, true)).toBe('manual')
    expect(guessVehicleType(null, false)).toBe('scooter')
  })
})

describe('marketplace mock data & slots', () => {
  it('resolveAvailableSlots prefers the per-date map', () => {
    expect(resolveAvailableSlots({ availableSlots: { '2026-10-20': ['17:00'] } })).toEqual({
      '2026-10-20': ['17:00'],
    })
  })

  it('falls back to the legacy shared shape with sorted times', () => {
    expect(
      resolveAvailableSlots({
        availableDates: ['2026-10-20', '2026-10-21'],
        timeSlots: ['18:00', '09:00'],
      }),
    ).toEqual({ '2026-10-20': ['09:00', '18:00'], '2026-10-21': ['09:00', '18:00'] })
    expect(resolveAvailableSlots({ availableSlots: {} })).toEqual({})
    expect(resolveAvailableSlots({})).toEqual({})
  })

  it('mock listings / dealers / news have unique ids and required fields', () => {
    for (const list of [MOCK_MARKET_LISTINGS, MOCK_FEATURED_DEALERS, MOCK_VEHICLE_NEWS]) {
      const ids = (list as { id: string }[]).map((x) => x.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
    for (const l of MOCK_MARKET_LISTINGS) {
      expect(l.priceTwd).toBeGreaterThan(0)
      expect(l.vehicleSnapshot.brand).toBeTruthy()
    }
  })

  it('mock report is deterministic per listing and tones match its items', () => {
    const listing = MOCK_MARKET_LISTINGS[0]
    const a = buildMockReportSections(listing)
    expect(buildMockReportSections(listing)).toEqual(a)
    expect(a.length).toBeGreaterThan(0)
    for (const section of a) {
      const anyAttention = section.items.some((i) => i.badgeTone === 'warning')
      expect(section.statusTone).toBe(anyAttention ? 'warning' : 'success')
    }
    expect(buildMockInspectedDate(listing)).toBe(buildMockInspectedDate(listing))
  })
})
