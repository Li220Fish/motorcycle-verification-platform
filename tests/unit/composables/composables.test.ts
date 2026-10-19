import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'

import { useConversationVehicleLabel } from '@/composables/useConversationVehicleLabel'
import { useKnownIssueReminder } from '@/composables/useKnownIssueReminder'
import { useLiveAvatar } from '@/composables/useLiveAvatar'
import { useStorageUrl } from '@/composables/useStorageUrl'
import { useTapConfirmItem } from '@/composables/useTapConfirmItem'
import {
  CORE_VEHICLE_PHOTO_APR_ITEM_IDS,
  useVerificationCorePhotos,
} from '@/composables/useVerificationCorePhotos'
import * as fs from '../fakes/firestore'
import * as st from '../fakes/storage'

const flush = async () => {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0))
}

afterEach(() => vi.useRealTimers())

describe('useTapConfirmItem', () => {
  it('tap marks pass, tap again clears (not persisted)', () => {
    const onResult = vi.fn()
    const tap = useTapConfirmItem(onResult)
    tap.handleClick('headlight')
    expect(tap.state.headlight).toBe('pass')
    expect(onResult).toHaveBeenCalledWith('headlight', 'pass')
    tap.handleClick('headlight')
    expect(tap.state.headlight).toBeUndefined()
    expect(onResult).toHaveBeenCalledTimes(1)
  })

  it('long-press (450ms) opens the picker and swallows the trailing click', () => {
    vi.useFakeTimers()
    const onResult = vi.fn()
    const tap = useTapConfirmItem(onResult)
    tap.handlePointerDown('brake')
    vi.advanceTimersByTime(449)
    expect(tap.pickerKey.value).toBeNull()
    vi.advanceTimersByTime(1)
    expect(tap.pickerKey.value).toBe('brake')
    tap.handleClick('brake')
    expect(tap.state.brake).toBeUndefined()
    tap.pick('brake', 'fail')
    expect(tap.state.brake).toBe('fail')
    expect(tap.pickerKey.value).toBeNull()
    expect(onResult).toHaveBeenCalledWith('brake', 'fail')
  })

  it('releasing early cancels the long-press', () => {
    vi.useFakeTimers()
    const tap = useTapConfirmItem(vi.fn())
    tap.handlePointerDown('x')
    vi.advanceTimersByTime(200)
    tap.handlePointerUpOrLeave()
    vi.advanceTimersByTime(1000)
    expect(tap.pickerKey.value).toBeNull()
    tap.handlePointerDown('y')
    vi.advanceTimersByTime(500)
    tap.closePicker()
    expect(tap.pickerKey.value).toBeNull()
  })
})

describe('useKnownIssueReminder', () => {
  it('shows once per key, ignores empty lists', () => {
    const r = useKnownIssueReminder()
    const issues = [{ id: '1', part: 'sides', description: 'x' }] as never
    r.maybeShow('APR-left-side', [])
    expect(r.open.value).toBe(false)
    r.maybeShow('APR-left-side', issues)
    expect(r.open.value).toBe(true)
    expect(r.activeIssues.value).toEqual(issues)
    r.close()
    r.maybeShow('APR-left-side', issues)
    expect(r.open.value).toBe(false)
    r.maybeShow('APR-right-side', issues)
    expect(r.open.value).toBe(true)
  })
})

describe('useStorageUrl', () => {
  it('passes http(s) through, resolves paths, undefined for missing/empty', async () => {
    st.__put('private/a.jpg')
    const path = ref<string | null>('https://public/x.jpg')
    const url = useStorageUrl(path)
    await flush()
    expect(url.value).toBe('https://public/x.jpg')
    path.value = 'private/a.jpg'
    await flush()
    expect(url.value).toContain('private%2Fa.jpg')
    path.value = 'private/missing.jpg'
    await flush()
    expect(url.value).toBeUndefined()
    path.value = null
    await flush()
    expect(url.value).toBeUndefined()
  })
})

describe('useLiveAvatar', () => {
  it('falls back until the live value arrives; re-subscribes on uid change; unsubscribes on unmount', async () => {
    fs.__seed('publicAvatars/u1', { photoUrl: 'https://live1' })
    fs.__seed('publicAvatars/u2', { photoUrl: 'https://live2' })
    const uid = ref<string | null>('u1')
    let avatar!: ReturnType<typeof useLiveAvatar>
    const Comp = defineComponent({
      setup() {
        avatar = useLiveAvatar(uid, () => 'https://frozen')
        return () => h('div')
      },
    })
    const wrapper = mount(Comp)
    expect(avatar.value).toBe('https://frozen')
    await flush()
    expect(avatar.value).toBe('https://live1')
    uid.value = 'u2'
    await nextTick()
    await flush()
    expect(avatar.value).toBe('https://live2')
    uid.value = 'ghost'
    await nextTick()
    await flush()
    expect(avatar.value).toBe('https://frozen')
    wrapper.unmount()
  })
})

describe('useVerificationCorePhotos', () => {
  it('returns the newest photo per core item, in fixed order, skipping unresolvable ones', async () => {
    const seedEv = (id: string, itemId: string, at: number, path: string, type = 'photo') => {
      fs.__seed(`verifications/v1/evidence/${id}`, {
        id,
        itemId,
        type,
        remoteUrl: path,
        createdAt: at,
      })
      st.__put(path)
    }
    seedEv('r-old', 'APR-rear', 1, 'p/rear-old.jpg')
    seedEv('r-new', 'APR-rear', 2, 'p/rear-new.jpg')
    seedEv('l', 'APR-left-side', 1, 'p/left.jpg')
    seedEv('dash', 'APR-dashboard', 1, 'p/dash.jpg') // not a core appearance photo
    seedEv('aud', 'APR-right-side', 1, 'p/a.m4a', 'audio')
    fs.__seed('verifications/v1/evidence/gone', {
      id: 'gone',
      itemId: 'APR-engine-bottom',
      type: 'photo',
      remoteUrl: 'p/gone.jpg',
      createdAt: 1,
    })

    const id = ref<string | undefined>('v1')
    const photos = useVerificationCorePhotos(id)
    await flush()
    expect(photos.value).toHaveLength(2)
    expect(photos.value[0]).toContain('left.jpg')
    expect(photos.value[1]).toContain('rear-new.jpg')
    id.value = undefined
    await flush()
    expect(photos.value).toEqual([])
    expect(CORE_VEHICLE_PHOTO_APR_ITEM_IDS).not.toContain('APR-dashboard')
  })
})

describe('useConversationVehicleLabel', () => {
  it('vehicle first, then listing (cached), null when unresolvable', async () => {
    fs.__seed('vehicles/veh1', { brand: 'YAMAHA', model: 'MT-03' })
    fs.__seed('marketplaceListings/L1', { vehicleSnapshot: { brand: 'SYM', model: 'JET' } })
    const ctx = ref<Record<string, string> | undefined>({ vehicleId: 'veh1' })
    const label = useConversationVehicleLabel(ctx)
    await flush()
    expect(label.value).toBe('YAMAHA MT-03')

    ctx.value = { vehicleId: 'denied', listingId: 'L1' }
    await flush()
    expect(label.value).toBe('SYM JET')

    fs.__reset() // cached — no read needed the second time
    ctx.value = { listingId: 'L1' }
    await flush()
    expect(label.value).toBe('SYM JET')

    ctx.value = { listingId: 'nope' }
    await flush()
    expect(label.value).toBeNull()
    ctx.value = undefined
    await flush()
    expect(label.value).toBeNull()
  })
})
