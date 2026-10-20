import { flushPromises, shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('capacitor-voice-recorder', () => ({ VoiceRecorder: {} }))

import EngineInspectionFlow from '@/components/verification/engine/EngineInspectionFlow.vue'
import { resolveVehicleType } from '@/data/verification/engine-session'
import { useVehicleStore } from '@/stores/vehicle.store'
import { useVerificationStore } from '@/stores/verification.store'
import * as fs from '../fakes/firestore'

/** 檔車／速克達 is asked at most once per verification: the start-of-flow
 *  gate (owner), the engine placement screen and the chain items all read
 *  verificationStore.vehicleType. */
async function load(opts: {
  type: 'seller' | 'buyer'
  snapshotTransmission?: string
  vehicle?: Record<string, unknown>
}) {
  fs.__seed('verifications/v1', {
    vehicleId: 'veh1',
    userId: 'u1',
    type: opts.type,
    status: 'in_progress',
    createdAt: fs.Timestamp.fromMillis(1),
    ...(opts.type === 'buyer'
      ? {
          listingId: 'L1',
          vehicleSnapshot: {
            brand: 'Y',
            model: 'M',
            manufactureYear: 2021,
            transmission: opts.snapshotTransmission ?? '',
            modelId: null,
          },
        }
      : {}),
  })
  fs.__seed('vehicles/veh1', { currentOwnerId: 'u1', brand: 'Y', model: 'M', ...opts.vehicle })
  useVehicleStore().currentVehicle = { id: 'veh1', ...opts.vehicle } as never
  const store = useVerificationStore()
  await store.loadFlow('v1')
  return store
}

describe('resolveVehicleType', () => {
  it.each([
    [{ transmission: 'CVT 無段變速' }, 'scooter'],
    [{ transmission: '6速手排' }, 'manual'],
    [{ transmission: '6速', hasChain: true }, 'manual'], // catalog text alone is unclear
    [{ transmission: '自排', hasChain: false }, 'scooter'],
    [{ transmission: null, hasChain: true }, 'manual'],
    [{ transmission: '手排', hasChain: false }, 'manual'], // text wins over chain info
    [{ transmission: '6速' }, null],
    [{}, null],
  ] as const)('%j → %s', (info, expected) => {
    expect(resolveVehicleType(info)).toBe(expected)
  })
})

describe('verificationStore.vehicleType', () => {
  it('buyer: taken from the listing snapshot, never from the buyer’s own garage car', async () => {
    const store = await load({
      type: 'buyer',
      snapshotTransmission: '6速手排',
      vehicle: { transmission: 'CVT 無段變速' }, // stale, someone else's car
    })
    expect(store.vehicleType).toBe('manual')
    expect(store.hasExposedChainSprocket).toBe(true)
  })

  it('seller: transmission text, then hasChain', async () => {
    const store = await load({ type: 'seller', vehicle: { transmission: '6速', hasChain: false } })
    expect(store.vehicleType).toBe('scooter')
    expect(store.hasExposedChainSprocket).toBe(false)
  })

  it('buyer answer is saved on the verification snapshot (not the seller’s vehicle)', async () => {
    const store = await load({ type: 'buyer', snapshotTransmission: '' })
    expect(store.vehicleType).toBeNull()
    await store.setVehicleType('scooter')
    expect(store.vehicleType).toBe('scooter')
    const saved = fs.__get('verifications/v1')!.vehicleSnapshot as { transmission: string }
    expect(saved.transmission).toBe('CVT 無段變速')
    expect(fs.__get('vehicles/veh1')!.transmission).toBeUndefined()
  })

  it('seller answer is saved on the vehicle', async () => {
    const store = await load({ type: 'seller', vehicle: { transmission: null } })
    await store.setVehicleType('manual')
    expect(store.vehicleType).toBe('manual')
    expect(fs.__get('vehicles/veh1')!.transmission).toBe('手排')
  })

  it('a save failure still remembers the answer for this session', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const store = await load({ type: 'seller', vehicle: { transmission: null } })
    fs.__failNext('updateDoc')
    await store.setVehicleType('manual')
    expect(store.vehicleType).toBe('manual')
  })
})

describe('cold-engine screen does not ask again', () => {
  const mountFlow = () =>
    shallowMount(EngineInspectionFlow, {
      props: { verificationId: 'v1' },
      global: { stubs: { teleport: true }, renderStubDefaultSlot: true },
    })
  const asksType = (wrapper: ReturnType<typeof mountFlow>) =>
    wrapper.text().includes('速可達') && wrapper.text().includes('檔車')

  it('buyer: type known from the listing → straight to the placement guide', async () => {
    await load({ type: 'buyer', snapshotTransmission: 'CVT 無段變速' })
    const wrapper = mountFlow()
    await flushPromises()
    expect(asksType(wrapper)).toBe(false)
  })

  it('seller: answered at the start gate → not asked again here', async () => {
    const store = await load({ type: 'seller', vehicle: { transmission: null } })
    await store.setVehicleType('manual')
    const wrapper = mountFlow()
    await flushPromises()
    expect(asksType(wrapper)).toBe(false)
  })

  it('still asks when nothing knows the type', async () => {
    await load({ type: 'buyer', snapshotTransmission: '' })
    const wrapper = mountFlow()
    await flushPromises()
    expect(asksType(wrapper)).toBe(true)
  })
})
