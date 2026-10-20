import { afterEach, describe, expect, it, vi } from 'vitest'

import { photoQualityService } from '@/services/media/photo-quality.service'
import { effectiveRoll, startTilt, stopTilt, tilt } from '@/services/media/device-tilt.service'
import { platformService } from '@/services/platform/platform.service'
import { futureAiRecognitionService } from '@/services/recognition/future-ai-recognition.service'
import { mockRecognitionService } from '@/services/recognition/mock-recognition.service'
import { vehicleSearchService } from '@/services/search/vehicle-search.service'
import { comparisonService } from '@/services/verification/comparison.service'
import { computeVerificationScore, scorableAnswers } from '@/services/verification/scoring.service'
import { tourService } from '@/services/verification/tour.service'
import { getFlatItems } from '@/data/verification'
import { useLocaleStore } from '@/stores/locale.store'
import type { AnswerResultValue, VerificationAnswer } from '@/types/verification-evidence'
import * as fs from '../fakes/firestore'

const a = (itemId: string, result: AnswerResultValue, ai = false): VerificationAnswer => ({
  itemId,
  result,
  updatedAt: 0,
  ...(ai ? { aiResult: { label: 'x', details: {} } as never } : {}),
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('computeVerificationScore', () => {
  it('normal / eligible, rounded; not_applicable excluded; unsure counts against', () => {
    expect(
      computeVerificationScore([a('1', 'normal'), a('2', 'normal'), a('3', 'attention')]),
    ).toBe(67)
    expect(computeVerificationScore([a('1', 'normal'), a('2', 'unsure')])).toBe(50)
    expect(computeVerificationScore([a('1', 'normal'), a('2', 'not_applicable')])).toBe(100)
  })
  it('null when nothing is eligible (never a fabricated 100)', () => {
    expect(computeVerificationScore([])).toBeNull()
    expect(computeVerificationScore([a('1', 'not_applicable')])).toBeNull()
  })
})

describe('scorableAnswers', () => {
  it('only required items, one answer each, AI verdict (worst-of) replaces the placeholder', () => {
    const answers: Record<string, VerificationAnswer> = {
      'APR-rear': a('APR-rear', 'normal'),
      body_damage_rear: a('body_damage_rear', 'normal', true),
      paint_condition_rear: a('paint_condition_rear', 'attention', true),
      'APR-dashboard': a('APR-dashboard', 'normal'),
      'ENG-01': a('ENG-01', 'attention'), // optional → excluded
    }
    const result = scorableAnswers(answers, 'seller')
    expect(result.find((r) => r.itemId === 'APR-rear')!.result).toBe('attention')
    expect(result.find((r) => r.itemId === 'APR-dashboard')!.result).toBe('normal')
    expect(result.some((r) => r.itemId === 'ENG-01')).toBe(false)
    expect(result.some((r) => r.itemId === 'body_damage_rear')).toBe(false)
    expect(computeVerificationScore(result)).toBe(50)
  })
  it('AI answers without aiResult are ignored', () => {
    const result = scorableAnswers(
      { 'APR-rear': a('APR-rear', 'normal'), body_damage_rear: a('body_damage_rear', 'attention') },
      'seller',
    )
    expect(result.find((r) => r.itemId === 'APR-rear')!.result).toBe('normal')
  })
})

describe('comparisonService', () => {
  it('pairs every seller item with the buyer answer', async () => {
    fs.__seed('verifications/s/answers/APR-rear', { itemId: 'APR-rear', result: 'normal' })
    fs.__seed('verifications/b/answers/APR-rear', { itemId: 'APR-rear', result: 'normal' })
    fs.__seed('verifications/s/answers/APR-dashboard', {
      itemId: 'APR-dashboard',
      result: 'normal',
    })
    fs.__seed('verifications/b/answers/APR-dashboard', {
      itemId: 'APR-dashboard',
      result: 'attention',
    })
    fs.__seed('verifications/b/answers/RIDE-01', { itemId: 'RIDE-01', result: 'normal' })
    const rows = await comparisonService.buildComparison('s', 'b')
    expect(rows).toHaveLength(getFlatItems('seller').length)
    const by = (id: string) => rows.find((r) => r.sellerItemId === id)!
    expect(by('APR-rear').match).toBe('match')
    expect(by('APR-dashboard')).toMatchObject({
      match: 'different',
      sellerResult: 'normal',
      buyerResult: 'attention',
    })
    expect(by('APR-left-side').match).toBe('not_checked')
    expect(rows.some((r) => r.sellerItemId === 'RIDE-01')).toBe(false)
  })
})

describe('tourService', () => {
  it('remembers that the tour was seen', () => {
    expect(tourService.hasSeenTour()).toBe(false)
    tourService.markTourSeen()
    expect(tourService.hasSeenTour()).toBe(true)
  })
  it('fails open (seen) when storage throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
    })
    expect(tourService.hasSeenTour()).toBe(true)
  })
})

describe('vehicleSearchService (demo)', () => {
  it('matches brand/model case-insensitively, empty → [], test-error throws', async () => {
    vi.useFakeTimers()
    const run = async (q: string) => {
      const p = vehicleSearchService.search(q)
      await vi.advanceTimersByTimeAsync(600)
      return p
    }
    expect((await run('nmax')).map((r) => r.id)).toEqual(['demo-search-1'])
    expect((await run('  honda ')).map((r) => r.id)).toEqual(['demo-search-2'])
    expect(await run('   ')).toEqual([])
    expect(await run('ducati')).toEqual([])
    const err = vehicleSearchService.search('TEST-ERROR')
    const assertion = expect(err).rejects.toThrow('搜尋服務暫時無法使用')
    await vi.advanceTimersByTimeAsync(600)
    await assertion
  })
})

describe('recognition', () => {
  async function run<T>(p: Promise<T>): Promise<T> {
    await vi.advanceTimersByTimeAsync(900)
    return p
  }
  it('mock recognition scenarios are deterministic and localized', async () => {
    vi.useFakeTimers()
    expect((await run(mockRecognitionService.analyzeImage({} as never))).status).toBe('completed')
    expect(
      (await run(mockRecognitionService.analyzeImage({ scenario: 'issue' } as never))).status,
    ).toBe('review_required')
    expect(
      (await run(mockRecognitionService.analyzeImage({ scenario: 'error' } as never))).status,
    ).toBe('error')
    expect((await run(mockRecognitionService.analyzeDamage({} as never))).status).toBe(
      'review_required',
    )
    expect(
      (await run(mockRecognitionService.analyzeDamage({ scenario: 'normal' } as never))).status,
    ).toBe('completed')
    expect(
      (await run(mockRecognitionService.analyzeDamage({ scenario: 'error' } as never))).status,
    ).toBe('error')
    const doc = await run(mockRecognitionService.analyzeDocument({} as never))
    expect(doc.fields?.車牌).toBe('ABC-1234')
    expect(
      (await run(mockRecognitionService.analyzeDocument({ scenario: 'error' } as never))).status,
    ).toBe('error')
    useLocaleStore().locale = 'en'
    expect((await run(mockRecognitionService.analyzeImage({} as never))).findings).toEqual([
      'No obvious issues found',
    ])
  })
  it('the real-AI placeholder always refuses', async () => {
    await expect(futureAiRecognitionService.analyzeImage({} as never)).rejects.toThrow(
      'not implemented',
    )
    await expect(futureAiRecognitionService.analyzeDamage({} as never)).rejects.toThrow(
      'not implemented',
    )
    await expect(futureAiRecognitionService.analyzeDocument({} as never)).rejects.toThrow(
      'not implemented',
    )
  })
})

describe('platformService (web)', () => {
  it('reports web', () => {
    expect(platformService.getPlatform()).toBe('web')
    expect(platformService.isNative()).toBe(false)
    expect(platformService.isWeb()).toBe(true)
    expect(platformService.isAndroid()).toBe(false)
    expect(platformService.isIOS()).toBe(false)
  })
})

describe('device tilt', () => {
  function motion(x: number, y: number, z: number) {
    const event = new Event('devicemotion') as DeviceMotionEvent
    Object.defineProperty(event, 'accelerationIncludingGravity', { value: { x, y, z } })
    window.dispatchEvent(event)
  }
  it('computes roll/pitch from gravity, smooths, and only reports roll when upright', async () => {
    vi.stubGlobal('DeviceMotionEvent', class {})
    await startTilt()
    motion(0, 9.8, 0) // upright, level
    expect(tilt.rollDeg).toBeCloseTo(0)
    expect(tilt.pitchDeg).toBeCloseTo(90)
    expect(effectiveRoll()).toBeCloseTo(0)
    motion(9.8, 9.8, 0) // 45° roll, smoothed by 0.25
    expect(tilt.rollDeg).toBeCloseTo(11.25)
    stopTilt()
    expect(tilt.rollDeg).toBeNull()
    expect(effectiveRoll()).toBeNull()
  })
  it('flat on a table → roll is not meaningful', async () => {
    vi.stubGlobal('DeviceMotionEvent', class {})
    await startTilt()
    motion(0, 0.5, 9.8)
    expect(effectiveRoll()).toBeNull()
    stopTilt()
  })
  it('iOS permission denied → no listener', async () => {
    vi.stubGlobal('DeviceMotionEvent', { requestPermission: async () => 'denied' })
    await startTilt()
    motion(0, 9.8, 0)
    expect(tilt.rollDeg).toBeNull()
  })
})

describe('photoQualityService', () => {
  /** Feeds assess() a synthetic luma image via stubbed bitmap/canvas APIs. */
  function withImage(width: number, height: number, pixel: (x: number, y: number) => number) {
    vi.stubGlobal('createImageBitmap', async () => ({ width, height, close: () => {} }))
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
      this: HTMLCanvasElement,
    ) {
      const w = this.width
      const h = this.height
      return {
        drawImage: () => {},
        getImageData: () => {
          const data = new Uint8ClampedArray(w * h * 4)
          for (let y = 0; y < h; y++)
            for (let x = 0; x < w; x++) {
              const v = pixel(x, y)
              const i = (y * w + x) * 4
              data[i] = data[i + 1] = data[i + 2] = v
              data[i + 3] = 255
            }
          return { data }
        },
      } as never
    })
  }

  it('a sharp, well-lit frame is ok', async () => {
    withImage(640, 480, (x, y) => (((x >> 1) + (y >> 1)) % 2 ? 200 : 60))
    const report = await photoQualityService.assess(new Blob())
    expect(report.level).toBe('ok')
    expect(report.message).toBe('')
    expect(report.metrics.capturedWidth).toBe(640)
  })

  it('a flat (featureless) frame is rejected as out of focus', async () => {
    withImage(640, 480, () => 128)
    const report = await photoQualityService.assess(new Blob())
    expect(report).toMatchObject({ level: 'reject', issues: ['out_of_focus'] })
    expect(report.message).toBe('整張照片都沒對到焦')
  })

  it('a mostly-black frame is rejected as too dark', async () => {
    withImage(640, 480, (x, y) => (x < 40 && (x + y) % 2 ? 255 : 5))
    const report = await photoQualityService.assess(new Blob())
    expect(report.issues).toContain('too_dark')
    expect(report.level).toBe('reject')
  })

  it('heavy glare is a warning', async () => {
    withImage(640, 480, (x, y) => (y < 60 ? 255 : ((x >> 1) + (y >> 1)) % 2 ? 200 : 60))
    const report = await photoQualityService.assess(new Blob())
    expect(report.issues).toContain('glare')
    expect(report.level).toBe('warn')
  })

  it('never blocks capture when analysis itself fails', async () => {
    vi.stubGlobal('createImageBitmap', async () => {
      throw new Error('decode failed')
    })
    expect((await photoQualityService.assess(new Blob())).level).toBe('ok')
  })

  it('isCaptureResolutionLow', () => {
    expect(photoQualityService.isCaptureResolutionLow(null)).toBe(false)
    expect(photoQualityService.isCaptureResolutionLow({ width: 640, height: 480 })).toBe(true)
    expect(photoQualityService.isCaptureResolutionLow({ width: 1920, height: 1080 })).toBe(false)
  })
})
