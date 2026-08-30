/**
 * DEMO marketplace listings — the real Marketplace/transaction backend does
 * not exist yet (§41 of the Home redesign spec). Every card sourced from
 * this file must be visibly labelled DEMO in the UI so it can never be
 * mistaken for a real listing.
 */
export interface MockMarketListing {
  id: string
  brand: string
  model: string
  year: number
  mileageKm: number
  priceTwd: number
  verified: boolean
}

export const MOCK_MARKET_LISTINGS: MockMarketListing[] = [
  {
    id: 'demo-1',
    brand: 'YAMAHA',
    model: 'NMAX',
    year: 2023,
    mileageKm: 12500,
    priceTwd: 68000,
    verified: true,
  },
  {
    id: 'demo-2',
    brand: 'HONDA',
    model: 'CB300R',
    year: 2022,
    mileageKm: 8300,
    priceTwd: 145000,
    verified: true,
  },
  {
    id: 'demo-3',
    brand: 'KYMCO',
    model: 'KRV 180',
    year: 2022,
    mileageKm: 7200,
    priceTwd: 112000,
    verified: false,
  },
  {
    id: 'demo-4',
    brand: 'SYM',
    model: 'JET SR',
    year: 2021,
    mileageKm: 15800,
    priceTwd: 52000,
    verified: true,
  },
  {
    id: 'demo-5',
    brand: 'YAMAHA',
    model: '勁戰六代',
    year: 2021,
    mileageKm: 18650,
    priceTwd: 79000,
    verified: true,
  },
]
