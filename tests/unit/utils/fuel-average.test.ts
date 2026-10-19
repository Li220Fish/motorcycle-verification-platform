import { describe, expect, it } from 'vitest'

import { computeAverageFuelConsumption } from '@/utils/fuel-average'

const full = (mileage: number, liters: number) => ({ mileage, liters, fullTank: true })
const partial = (mileage: number, liters: number) => ({ mileage, liters, fullTank: false })

describe('computeAverageFuelConsumption', () => {
  it('spec example: 10000 full → 10150 +3.0 → 10350 +4.5 full = 46.7 km/L', () => {
    expect(
      computeAverageFuelConsumption([full(10000, 5), partial(10150, 3), full(10350, 4.5)]),
    ).toBe(46.7)
  })

  it('is order-independent (sorts by mileage)', () => {
    expect(
      computeAverageFuelConsumption([full(10350, 4.5), full(10000, 5), partial(10150, 3)]),
    ).toBe(46.7)
  })

  it('returns null without a closed full-to-full segment', () => {
    expect(computeAverageFuelConsumption([])).toBeNull()
    expect(computeAverageFuelConsumption([full(100, 5)])).toBeNull()
    expect(computeAverageFuelConsumption([partial(100, 5), partial(200, 5)])).toBeNull()
    expect(computeAverageFuelConsumption([full(100, 5), partial(200, 3)])).toBeNull()
  })

  it('ignores partial fills before the first full tank', () => {
    expect(computeAverageFuelConsumption([partial(50, 9), full(100, 5), full(300, 5)])).toBe(40)
  })

  it('skips entries with null mileage or litres', () => {
    expect(
      computeAverageFuelConsumption([
        full(100, 5),
        { mileage: null, liters: 3, fullTank: false },
        { mileage: 200, liters: null, fullTank: false },
        full(300, 4),
      ]),
    ).toBe(50)
  })

  it('totals distance / litres across segments (not an average of ratios)', () => {
    // seg1: 100km / 2L = 50 ; seg2: 300km / 10L = 30 ; overall 400 / 12 = 33.3
    expect(computeAverageFuelConsumption([full(0, 1), full(100, 2), full(400, 10)])).toBe(33.3)
  })

  it('drops zero-distance segments', () => {
    expect(computeAverageFuelConsumption([full(100, 1), full(100, 2)])).toBeNull()
  })
})
