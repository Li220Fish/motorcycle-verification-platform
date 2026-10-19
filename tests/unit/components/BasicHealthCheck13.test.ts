import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'

import BasicHealthCheck13 from '@/components/verification/BasicHealthCheck13.vue'
import { useAiChatStore } from '@/stores/ai-chat.store'
import { useVehicleStore } from '@/stores/vehicle.store'
import { useVerificationStore } from '@/stores/verification.store'
import type { VerificationEvidence } from '@/types/verification-evidence'
import * as fs from '../fakes/firestore'
import * as st from '../fakes/storage'

const PhotoCaptureStub = defineComponent({
  name: 'HealthCheckIssuePhotoCapture',
  props: ['verificationId', 'itemKey', 'itemLabel', 'vehicleType'],
  emits: ['captured', 'skip'],
  setup: (props) => () => h('div', { class: 'capture-stub', 'data-key': props.itemKey }),
})

async function setup(type: 'seller' | 'buyer' = 'buyer', extra: Record<string, unknown> = {}) {
  fs.__seed('verifications/v1', {
    vehicleId: 'veh1',
    userId: 'u1',
    type,
    status: 'in_progress',
    createdAt: fs.Timestamp.fromMillis(1),
    ...extra,
  })
  useVehicleStore().currentVehicle = { id: 'veh1', transmission: '6速手排' } as never
  const store = useVerificationStore()
  await store.loadFlow('v1')
  const wrapper = mount(BasicHealthCheck13, {
    props: { hasChain: true, embedded: true },
    global: {
      stubs: {
        HealthCheckIssuePhotoCapture: PhotoCaptureStub,
        VerificationHelpSheet: defineComponent({
          props: ['open', 'title', 'content'],
          setup: (p) => () =>
            p.open ? h('div', { class: 'help-stub' }, `${p.title}|${p.content}`) : null,
        }),
      },
    },
  })
  await flushPromises()
  return { store, wrapper }
}

function photo(id: string, createdAt: number, remoteUrl?: string): VerificationEvidence {
  return {
    id,
    verificationId: 'v1',
    itemId: 'BASIC-headlight',
    type: 'photo',
    createdAt,
    captureSource: 'camera',
    captureTimestamp: createdAt,
    remoteUrl,
  }
}

const row = (wrapper: ReturnType<typeof mount>, label: string) =>
  wrapper.findAll('.result-row').find((r) => r.text().includes(label))!

beforeEach(() => {
  vi.useRealTimers()
})

describe('BasicHealthCheck13', () => {
  it('renders page 1 items on the default photo and pages through', async () => {
    const { wrapper } = await setup()
    const page1 = wrapper.findAll('.result-row').length
    expect(page1).toBeGreaterThan(0)
    expect(wrapper.find('.count').text()).toBe('1 / 2')
    const [, next] = wrapper.findAll('.page-nav button')
    await next.trigger('click')
    expect(wrapper.find('.count').text()).toBe('2 / 2')
    expect(wrapper.findAll('.bike-img-wrap.mirrored')).toHaveLength(1)
    expect(wrapper.findAll('.result-row').length + page1).toBe(13)
  })

  it('a quick tap saves 正常 (normal) under BASIC-<key> and updates progress', async () => {
    const { store, wrapper } = await setup()
    const first = wrapper.findAll('.result-row')[0]
    await first.trigger('click')
    const key = Object.keys(store.answers).find((k) => k.startsWith('BASIC-'))!
    expect(store.answers[key].result).toBe('normal')
    expect(first.classes()).toContain('pass')
    expect(wrapper.find('.progress-count').text()).toContain('1')
  })

  it('hydrates prior taps (fail → ✗) from saved answers', async () => {
    fs.__seed('verifications/v1/answers/BASIC-headlight', {
      itemId: 'BASIC-headlight',
      result: 'attention',
      updatedAt: 1,
    })
    const { wrapper } = await setup()
    expect(row(wrapper, '大燈').classes()).toContain('fail')
  })

  it('no camera icon until a photo exists', async () => {
    const { wrapper } = await setup()
    expect(row(wrapper, '大燈').find('.photo-indicator').exists()).toBe(false)
  })

  it('camera icon → popover with the resolved photo → retake opens the camera for that item', async () => {
    st.__put('verifications/v1/evidence/h.jpg')
    fs.__seed(
      'verifications/v1/evidence/p1',
      photo('p1', 5, 'verifications/v1/evidence/h.jpg') as never,
    )
    const { wrapper } = await setup()
    const headlight = row(wrapper, '大燈')
    const icon = headlight.find('.photo-indicator')
    expect(icon.exists()).toBe(true)
    await icon.trigger('click')
    await flushPromises()
    const popover = wrapper.find('.photo-popover')
    expect(popover.exists()).toBe(true)
    expect(popover.find('img').attributes('src')).toContain('h.jpg')
    // clicking the icon must not also toggle the row's pass state
    expect(headlight.classes()).not.toContain('pass')

    await popover.find('.retake-btn').trigger('click')
    expect(wrapper.find('.photo-popover').exists()).toBe(false)
    expect(wrapper.find('.capture-stub').attributes('data-key')).toBe('headlight')

    await icon.trigger('click') // toggles open again
    expect(wrapper.find('.photo-popover').exists()).toBe(true)
  })

  it('after a new capture only the newest photo is kept (Firestore + Storage)', async () => {
    st.__put('verifications/v1/evidence/old.jpg')
    fs.__seed(
      'verifications/v1/evidence/old',
      photo('old', 1, 'verifications/v1/evidence/old.jpg') as never,
    )
    fs.__seed('verifications/v1/evidence/new', photo('new', 9) as never)
    const { store, wrapper } = await setup()
    await row(wrapper, '大燈').find('.photo-indicator').trigger('click')
    await wrapper.find('.retake-btn').trigger('click')
    wrapper.findComponent(PhotoCaptureStub).vm.$emit('captured')
    await flushPromises()
    expect(store.evidenceByItem['BASIC-headlight'].map((e) => e.id)).toEqual(['new'])
    expect(fs.__get('verifications/v1/evidence/old')).toBeUndefined()
    expect(st.__has('verifications/v1/evidence/old.jpg')).toBe(false)
    expect(wrapper.find('.capture-stub').exists()).toBe(false)
  })

  it('buyer: 詢問 AI in the photo popover opens the chat with that evidence photo', async () => {
    st.__put('verifications/v1/evidence/h.jpg')
    fs.__seed(
      'verifications/v1/evidence/p1',
      photo('p1', 5, 'verifications/v1/evidence/h.jpg') as never,
    )
    const { wrapper } = await setup('buyer')
    await row(wrapper, '大燈').find('.photo-indicator').trigger('click')
    await flushPromises()
    await wrapper.find('.ask-ai-btn').trigger('click')
    const chat = useAiChatStore()
    expect(chat.open).toBe(true)
    expect(chat.pendingImage?.image).toEqual({ storagePath: 'verifications/v1/evidence/h.jpg' })
    expect(wrapper.find('.photo-popover').exists()).toBe(false)
  })

  it('seller: no 詢問 AI button (AI chat is buyer-only)', async () => {
    st.__put('verifications/v1/evidence/h.jpg')
    fs.__seed(
      'verifications/v1/evidence/p1',
      photo('p1', 5, 'verifications/v1/evidence/h.jpg') as never,
    )
    const { wrapper } = await setup('seller')
    await row(wrapper, '大燈').find('.photo-indicator').trigger('click')
    await flushPromises()
    expect(wrapper.find('.ask-ai-btn').exists()).toBe(false)
  })

  it('cancelling the camera keeps the existing photo', async () => {
    fs.__seed('verifications/v1/evidence/old', photo('old', 1) as never)
    const { store, wrapper } = await setup()
    await row(wrapper, '大燈').find('.photo-indicator').trigger('click')
    await wrapper.find('.retake-btn').trigger('click')
    wrapper.findComponent(PhotoCaptureStub).vm.$emit('skip')
    await flushPromises()
    expect(store.evidenceByItem['BASIC-headlight'].map((e) => e.id)).toEqual(['old'])
  })

  it('finish is disabled until every required item is answered, then advance is emitted', async () => {
    const { wrapper } = await setup()
    const finishBtn = () => wrapper.find('.bottom-bar button')
    expect(finishBtn().attributes('disabled')).toBeDefined()
    for (let page = 0; page < 2; page++) {
      for (const r of wrapper.findAll('.result-row')) await r.trigger('click')
      if (page === 0) await wrapper.findAll('.page-nav button')[1].trigger('click')
    }
    expect(finishBtn().attributes('disabled')).toBeUndefined()
    await finishBtn().trigger('click')
    await wrapper.find('.bottom-bar button').trigger('click')
    expect(wrapper.emitted('advance')).toHaveLength(1)
  })

  it('buyer flow: first touch of an item with a known issue shows the reminder once', async () => {
    const { wrapper } = await setup('buyer', {
      buyerKnownIssuesSnapshot: [
        { id: 'k', part: 'front_suspension', description: '前叉油封易漏油' },
      ],
    })
    const front = wrapper.findAll('.result-row').find((r) => r.text().includes('前避震'))
    const target =
      front ??
      (await (async () => {
        await wrapper.findAll('.page-nav button')[1].trigger('click')
        return wrapper.findAll('.result-row').find((r) => r.text().includes('前避震'))!
      })())
    await target.trigger('pointerdown')
    expect(wrapper.find('.help-stub').text()).toContain('前叉油封易漏油')
  })

  it('no chain item when the bike has no chain', async () => {
    const { wrapper } = await setup()
    await wrapper.setProps({ hasChain: false })
    await wrapper.findAll('.page-nav button')[1].trigger('click')
    const all = wrapper.text()
    expect(all).not.toContain('鏈條')
  })
})
