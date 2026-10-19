import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The real animations are exercised in appearance-anims.test.ts; here they
// are replaced with a recorder so the screen logic can be tested on its own.
const anim = vi.hoisted(() => ({ mounted: [] as { key: string; mode: string }[] }))
vi.mock('@/components/verification/buyer-appearance/appearance-anims', () => ({
  mountAppearanceAnim: (_host: HTMLElement, key: string, mode: string) => {
    anim.mounted.push({ key, mode })
    return {
      loop: vi.fn(),
      playOnce: vi.fn((done?: () => void) => done?.()),
      still: vi.fn(),
      stop: vi.fn(),
    }
  },
}))
vi.mock('@/services/media/image-compression.service', () => ({
  imageCompressionService: {
    compressImage: vi.fn(async (b: Blob) => ({ blob: b, width: 1, height: 1 })),
  },
}))

import BuyerAppearanceCheck from '@/components/verification/buyer-appearance/BuyerAppearanceCheck.vue'
import { BUYER_APPEARANCE_ITEM_IDS } from '@/data/verification/buyer-appearance-items'
import { useAiChatStore } from '@/stores/ai-chat.store'
import { useLocaleStore } from '@/stores/locale.store'
import { useVehicleStore } from '@/stores/vehicle.store'
import { useVerificationStore } from '@/stores/verification.store'
import * as fs from '../fakes/firestore'
import * as st from '../fakes/storage'

async function setup(initialItemId?: string) {
  fs.__seed('verifications/v1', {
    vehicleId: 'veh1',
    userId: 'b1',
    type: 'buyer',
    status: 'in_progress',
    createdAt: fs.Timestamp.fromMillis(1),
  })
  useVehicleStore().currentVehicle = { id: 'veh1', transmission: '6速手排' } as never
  const store = useVerificationStore()
  await store.loadFlow('v1')
  const wrapper = mount(BuyerAppearanceCheck, {
    props: { verificationId: 'v1', initialItemId },
    attachTo: document.body,
  })
  await flushPromises()
  return { store, wrapper }
}

const root = () => document.body.querySelector('.buyer-appearance') as HTMLElement
const q = (sel: string) => root().querySelector(sel) as HTMLElement | null
const click = async (el: Element | null) => {
  ;(el as HTMLElement).click()
  await flushPromises()
}
async function pick(value: 'ok' | 'bad' | 'unsure') {
  const input = q(`input[value="${value}"]`) as HTMLInputElement
  input.checked = true
  input.dispatchEvent(new Event('change'))
  await flushPromises()
}

beforeEach(() => {
  anim.mounted = []
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:preview' }))
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('BuyerAppearanceCheck', () => {
  it('starts on the first item’s looping animation (full-screen)', async () => {
    const { wrapper } = await setup()
    expect(q('.ba-head h2')!.textContent).toBe('龍頭轉向間隙')
    expect(q('.ba-code')!.textContent).toBe('C-04 · 轉向系統')
    expect(anim.mounted).toEqual([{ key: 'steer', mode: 'meet' }])
    expect(root().querySelectorAll('.ba-prog i')).toHaveLength(7)
    wrapper.unmount()
  })

  it('跳過 / 看完了 opens the check sheet with the freeze frame', async () => {
    await setup()
    await click(q('.ba-skip'))
    expect(q('.ba-q h3')!.textContent).toBe('把手末端和油箱之間有空隙嗎？')
    expect(anim.mounted.at(-1)).toEqual({ key: 'steer', mode: 'fill' })
    expect(q('.ba-count')!.textContent).toBe('1/7')
  })

  it('正常 saves normal and moves on to the next item', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    const { store } = await setup()
    await click(q('.ba-skip'))
    const done = q('.ba-bar .ba-cta') as HTMLButtonElement
    expect(done.disabled).toBe(true)
    await pick('ok')
    expect(done.disabled).toBe(false)
    await click(done)
    expect(store.answers['BUYER-APP-steer'].result).toBe('normal')
    expect(q('.ba-toast')!.textContent).toContain('已記錄：正常')
    await vi.advanceTimersByTimeAsync(700)
    expect(q('.ba-head h2')!.textContent).toBe('把手端子與拉桿')
  })

  it('異常 requires a description, and saves as attention with the note', async () => {
    const { store } = await setup()
    await click(q('.ba-skip'))
    await pick('bad')
    const done = q('.ba-bar .ba-cta') as HTMLButtonElement
    expect(done.disabled).toBe(true)
    expect(q('.ba-note small')!.textContent).toBe('必填')
    const textarea = q('textarea') as HTMLTextAreaElement
    textarea.value = '左把手碰到油箱'
    textarea.dispatchEvent(new Event('input'))
    await flushPromises()
    expect(done.disabled).toBe(false)
    await click(done)
    expect(store.answers['BUYER-APP-steer']).toMatchObject({
      result: 'attention',
      note: '左把手碰到油箱',
    })
  })

  it('不確定 saves unsure; the last open item emits advance', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    for (const id of BUYER_APPEARANCE_ITEM_IDS.slice(0, 6)) {
      fs.__seed(`verifications/v1/answers/${id}`, { itemId: id, result: 'normal', updatedAt: 1 })
    }
    const { store, wrapper } = await setup()
    expect(q('.ba-head h2')!.textContent).toBe('引擎外蓋') // resumes at the only open item
    await click(q('.ba-skip'))
    await pick('unsure')
    expect(q('.ba-bar .ba-cta')!.textContent).toContain('完成外觀動畫檢查')
    await click(q('.ba-bar .ba-cta'))
    await vi.advanceTimersByTimeAsync(700)
    expect(store.answers['BUYER-APP-engine'].result).toBe('unsure')
    expect(wrapper.emitted('advance')).toHaveLength(1)
  })

  it('an already-answered initial item is skipped in favor of the first open one', async () => {
    fs.__seed('verifications/v1/answers/BUYER-APP-fork', {
      itemId: 'BUYER-APP-fork',
      result: 'attention',
      note: '左側下座磨平',
      updatedAt: 1,
    })
    await setup('BUYER-APP-fork')
    // answered item → starts at the first open one instead
    expect(q('.ba-head h2')!.textContent).toBe('龍頭轉向間隙')
  })

  it('正常 does not ask for a photo', async () => {
    await setup()
    await click(q('.ba-skip'))
    await pick('ok')
    expect(q('.ba-popup')).toBeNull()
    expect(q('.ba-photo')).toBeNull()
  })

  it.each(['bad', 'unsure'] as const)(
    '%s pops up the orange camera; the photo then shows 重新拍照 + 詢問 AI under it',
    async (value) => {
      const { store } = await setup()
      await click(q('.ba-skip'))
      await pick(value)
      expect(q('.ba-popup')).not.toBeNull()
      expect(q('.ba-cam-btn')).not.toBeNull() // orange camera, no photo yet
      expect(q('.ba-chip.ai')).toBeNull()

      const input = q('.ba-file') as HTMLInputElement
      Object.defineProperty(input, 'files', {
        value: [new File(['img'], 'a.jpg', { type: 'image/jpeg' })],
      })
      input.dispatchEvent(new Event('change'))
      await flushPromises()
      const evidence = store.evidenceByItem['BUYER-APP-steer']
      expect(evidence).toHaveLength(1)
      expect(st.__paths()[0]).toMatch(/^verifications\/v1\/evidence\/\d+-BUYER-APP-steer\.jpg$/)
      expect(q('.ba-popup-img')).not.toBeNull()
      expect(q('.ba-cam-btn')).toBeNull()
      const actions = q('.ba-popup-actions')!.textContent
      expect(actions).toContain('重新拍照')
      expect(actions).toContain('詢問 AI')

      await click(q('.ba-chip.ai'))
      const chat = useAiChatStore()
      expect(chat.open).toBe(true)
      expect(chat.pendingImage?.image).toEqual({ storagePath: evidence[0].remoteUrl })
      expect(q('.ba-popup')).toBeNull() // closes so the chat is visible
    },
  )

  it('closing the popup keeps the answer; the camera row reopens it', async () => {
    await setup()
    await click(q('.ba-skip'))
    await pick('unsure')
    await click(q('.ba-popup-close'))
    expect(q('.ba-popup')).toBeNull()
    expect(q('.ba-photo .ba-cam-badge')).not.toBeNull()
    await click(q('.ba-photo-open'))
    expect(q('.ba-popup')).not.toBeNull()
  })

  it('a retake keeps only the newest photo', async () => {
    const { store } = await setup()
    await click(q('.ba-skip'))
    const input = q('.ba-file') as HTMLInputElement
    for (const name of ['a.jpg', 'b.jpg']) {
      Object.defineProperty(input, 'files', { value: [new File([name], name)], configurable: true })
      input.dispatchEvent(new Event('change'))
      await flushPromises()
    }
    expect(store.evidenceByItem['BUYER-APP-steer']).toHaveLength(1)
    expect(st.__paths()).toHaveLength(1)
  })

  it('English mode uses the English item text', async () => {
    useLocaleStore().locale = 'en'
    await setup()
    expect(q('.ba-head h2')!.textContent).toBe('Steering Lock Clearance')
    await click(q('.ba-skip'))
    expect(q('label[data-k="bad"] b')!.textContent).toBe('Issue')
  })

  it('the close button returns to the hub', async () => {
    const { wrapper } = await setup()
    await click(q('.ba-top .ba-icon'))
    expect(wrapper.emitted('back')).toHaveLength(1)
  })
})
