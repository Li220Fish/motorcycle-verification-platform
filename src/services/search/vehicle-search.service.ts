/**
 * Framework-only vehicle search (§10/§42 of the Home redesign spec) — there
 * is no real cross-vehicle lookup backend yet. This simulates network
 * latency and returns clearly DEMO-labelled mock results so the Search UI
 * (loading / empty / result / error states) can be built and tested now,
 * then swapped for a real API later without touching the calling component.
 */
export interface VehicleSearchResult {
  id: string
  brand: string
  model: string
  year: number
  mileageKm: number
  lastVerifiedAt: string
  verificationAvailable: boolean
}

const MOCK_INDEX: VehicleSearchResult[] = [
  {
    id: 'demo-search-1',
    brand: 'YAMAHA',
    model: 'NMAX',
    year: 2022,
    mileageKm: 12450,
    lastVerifiedAt: '2026/08/20',
    verificationAvailable: true,
  },
  {
    id: 'demo-search-2',
    brand: 'HONDA',
    model: 'CB300R',
    year: 2023,
    mileageKm: 5100,
    lastVerifiedAt: '2026/07/02',
    verificationAvailable: true,
  },
]

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Searches by (loosely matched) plate / VIN / keyword. `test-error` is a
 * reserved query used only to exercise the error-state UI in QA/E2E — no
 * real plate or model name collides with it.
 */
async function search(query: string): Promise<VehicleSearchResult[]> {
  await delay(600)
  const trimmed = query.trim()
  if (trimmed.toLowerCase() === 'test-error') {
    throw new Error('搜尋服務暫時無法使用，請稍後再試')
  }
  if (!trimmed) return []
  const needle = trimmed.toLowerCase()
  return MOCK_INDEX.filter(
    (item) =>
      item.brand.toLowerCase().includes(needle) || item.model.toLowerCase().includes(needle),
  )
}

export const vehicleSearchService = { search }
