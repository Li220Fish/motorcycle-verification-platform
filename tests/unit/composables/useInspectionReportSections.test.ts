import { describe, expect, it } from 'vitest'
import { ref } from 'vue'

import { useInspectionReportSections } from '@/composables/useInspectionReportSections'
import { useLocaleStore } from '@/stores/locale.store'
import { useVehicleStore } from '@/stores/vehicle.store'
import * as fs from '../fakes/firestore'
import * as st from '../fakes/storage'

const flush = async () => {
  for (let i = 0; i < 8; i++) await new Promise((r) => setTimeout(r, 0))
}

function seed(extra: Record<string, unknown> = {}) {
  fs.__seed('verifications/v1', {
    vehicleId: 'veh1',
    userId: 'u1',
    type: 'seller',
    status: 'completed',
    createdAt: fs.Timestamp.fromMillis(new Date(2026, 9, 1).getTime()),
    completedAt: fs.Timestamp.fromMillis(new Date(2026, 9, 2).getTime()),
    vehicleSnapshot: { brand: 'YAMAHA', model: 'MT-03', modelId: 'm1' },
    ...extra,
  })
  useVehicleStore().currentVehicle = { id: 'veh1', transmission: '6速手排' } as never
}

function answer(itemId: string, result: string, extra: Record<string, unknown> = {}) {
  fs.__seed(`verifications/v1/answers/${itemId}`, { itemId, result, updatedAt: 1, ...extra })
}

async function setup() {
  const report = useInspectionReportSections(ref('v1'))
  await flush()
  return report
}

describe('useInspectionReportSections', () => {
  it('loads, dates the report by completion, and marks unchecked sections neutral', async () => {
    seed()
    const r = await setup()
    expect(r.loading.value).toBe(false)
    expect(r.loadError.value).toBeNull()
    expect(r.inspectedDate.value).toBe(new Date(2026, 9, 2).toLocaleDateString('zh-TW'))
    expect(r.sections.value.length).toBeGreaterThan(0)
    expect(r.sections.value.every((s) => s.statusTone === 'neutral')).toBe(true)
  })

  it('section status: attention > unsure > good', async () => {
    seed()
    answer('APR-left-side', 'normal')
    answer('APR-right-side', 'unsure')
    answer('APR-dashboard', 'normal')
    const r = await setup()
    const core = r.sections.value.find((s) => s.id === 'seller-phase1-core')!
    expect(core.statusTone).toBe('warning')
    expect(core.statusLabel).toBe('待確認')
  })

  it('AI verdicts override the placeholder (worst-of) and carry their notes', async () => {
    seed()
    answer('APR-rear', 'normal')
    answer('body_damage_rear', 'normal', { aiResult: { details: { note: 'fine' } } })
    answer('paint_condition_rear', 'attention', { aiResult: { details: { note: '後土除刮傷' } } })
    const r = await setup()
    const item = r.sections.value.flatMap((s) => s.items).find((i) => i.id === 'APR-rear')!
    expect(item.badgeTone).toBe('warning')
    expect(item.aiNote).toBe('後土除刮傷')
    const marker = r.diagramMarkers.value.find((m) => m.key === 'appearance')!
    expect(marker.tone).toBe('warning')
  })

  it('photos resolve through Storage; dashboard OCR text is surfaced', async () => {
    seed()
    st.__put('verifications/v1/evidence/dash.jpg')
    answer('APR-dashboard', 'normal')
    fs.__seed('verifications/v1/evidence/d1', {
      id: 'd1',
      verificationId: 'v1',
      itemId: 'APR-dashboard',
      type: 'photo',
      remoteUrl: 'verifications/v1/evidence/dash.jpg',
      createdAt: 1,
      metadata: { ocr: { text: '12,345 km', confidence: 0.9, note: null } },
    })
    const r = await setup()
    const item = r.sections.value.flatMap((s) => s.items).find((i) => i.id === 'APR-dashboard')!
    expect(item.ocrText).toBe('12,345 km')
    expect(item.photos?.[0]).toContain('dash.jpg')
  })

  it('engine items get session group labels', async () => {
    seed()
    const r = await setup()
    const items = r.sections.value.flatMap((s) => s.items)
    expect(items.find((i) => i.id === 'ENG-03')!.groupLabel).toBeTruthy()
    expect(items.find((i) => i.id === 'ENG-07')!.groupLabel).toBeTruthy()
    expect(items.find((i) => i.id === 'APR-rear')!.groupLabel).toBeUndefined()
  })

  it('used-price range from the model is appended as the last section', async () => {
    seed()
    fs.__seed('vehicleModels/m1', {
      brand: 'YAMAHA',
      usedPriceRangeTwd: { min: 120000, max: 150000 },
    })
    const r = await setup()
    const last = r.sections.value[r.sections.value.length - 1]
    expect(last.id).toBe('used-price-range')
    expect(last.items[0].badgeLabel).toBe('$120,000 ~ $150,000')
  })

  it('English report labels', async () => {
    useLocaleStore().locale = 'en'
    seed()
    fs.__seed('vehicleModels/m1', { usedPriceRangeTwd: { min: 1000, max: 2000 } })
    const r = await setup()
    expect(r.sections.value.at(-1)!.items[0].badgeLabel).toBe('NT$ 1,000 ~ NT$ 2,000')
    expect(r.inspectedDate.value).toBe(new Date(2026, 9, 2).toLocaleDateString('en-US'))
  })

  it('missing verification → not-found; a thrown read → denied', async () => {
    let r = await setup()
    expect(r.loadError.value).toBe('not-found')
    fs.__failNext('getDoc')
    r = await setup()
    expect(r.loadError.value).toBe('denied')
    expect(r.inspectedDate.value).toBe('—')
  })
})
