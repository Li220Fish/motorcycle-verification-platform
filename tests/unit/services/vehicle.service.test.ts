import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { vehicleLogService } from '@/services/firebase/vehicle-log.service'
import * as transfer from '@/services/firebase/vehicle-transfer.service'
import { vehicleService } from '@/services/firebase/vehicle.service'
import { useAuthStore } from '@/stores/auth.store'
import { useVehicleStore } from '@/stores/vehicle.store'
import * as fs from '../fakes/firestore'
import * as fn from '../fakes/functions'

const NOW = new Date(2026, 9, 18, 12, 0).getTime()

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})
afterEach(() => vi.useRealTimers())

const draft = { brand: 'YAMAHA', model: 'MT-03', mileage: 100, licensePlate: 'ABC-123' } as never

describe('vehicleService', () => {
  it('create stamps the owner from the caller, not the draft', async () => {
    const id = await vehicleService.create(
      { ...(draft as object), currentOwnerId: 'attacker' } as never,
      'u1',
    )
    expect(fs.__get(`vehicles/${id}`)!.currentOwnerId).toBe('u1')
  })

  it('get fills defaults for optional fields', async () => {
    fs.__seed('vehicles/a', {
      brand: 'B',
      model: 'M',
      currentOwnerId: 'u1',
      createdAt: fs.Timestamp.fromMillis(5),
    })
    expect(await vehicleService.get('a')).toMatchObject({
      id: 'a',
      modelId: null,
      manufactureYear: null,
      transmission: null,
      modified: false,
      photos: [],
      sortOrder: null,
      createdAt: 5,
      updatedAt: NOW,
    })
    expect(await vehicleService.get('missing')).toBeNull()
  })

  it('list is owner-scoped and in garage order (manual first, then newest)', async () => {
    fs.__seed('vehicles/old', { currentOwnerId: 'u1', createdAt: fs.Timestamp.fromMillis(1) })
    fs.__seed('vehicles/new', { currentOwnerId: 'u1', createdAt: fs.Timestamp.fromMillis(9) })
    fs.__seed('vehicles/pinned1', {
      currentOwnerId: 'u1',
      sortOrder: 1,
      createdAt: fs.Timestamp.fromMillis(2),
    })
    fs.__seed('vehicles/pinned0', {
      currentOwnerId: 'u1',
      sortOrder: 0,
      createdAt: fs.Timestamp.fromMillis(3),
    })
    fs.__seed('vehicles/other', { currentOwnerId: 'u2', createdAt: fs.Timestamp.fromMillis(99) })
    expect((await vehicleService.list('u1')).map((v) => v.id)).toEqual([
      'pinned0',
      'pinned1',
      'new',
      'old',
    ])
    expect((await vehicleService.listAll()).map((v) => v.id)[0]).toBe('other')
  })

  it('update / reorder / remove', async () => {
    fs.__seed('vehicles/a', { currentOwnerId: 'u1' })
    fs.__seed('vehicles/b', { currentOwnerId: 'u1' })
    await vehicleService.update('a', { color: '紅' } as never)
    expect(fs.__get('vehicles/a')!.color).toBe('紅')
    await vehicleService.reorder(['b', 'a'])
    expect(fs.__get('vehicles/b')!.sortOrder).toBe(0)
    expect(fs.__get('vehicles/a')!.sortOrder).toBe(1)
    await vehicleService.remove('a')
    expect(fs.__get('vehicles/a')).toBeUndefined()
  })

  it('reorder is all-or-nothing', async () => {
    fs.__seed('vehicles/a', { currentOwnerId: 'u1' })
    await expect(vehicleService.reorder(['a', 'ghost'])).rejects.toThrow()
    expect(fs.__get('vehicles/a')!.sortOrder).toBeUndefined()
  })
})

describe('vehicle store', () => {
  function signIn() {
    useAuthStore().user = { id: 'u1', email: 'a@b.com' } as never
  }

  it('fetchVehicles is empty when signed out', async () => {
    fs.__seed('vehicles/a', { currentOwnerId: 'u1' })
    const store = useVehicleStore()
    await store.fetchVehicles()
    expect(store.vehicles).toEqual([])
  })

  it('createVehicle requires sign-in, then refreshes the garage', async () => {
    const store = useVehicleStore()
    await expect(store.createVehicle(draft)).rejects.toThrow('必須登入才能新增車輛')
    signIn()
    const id = await store.createVehicle(draft)
    expect(store.vehicles.map((v) => v.id)).toEqual([id])
  })

  it('update / reorder / delete keep local state in sync', async () => {
    signIn()
    fs.__seed('vehicles/a', { currentOwnerId: 'u1', createdAt: fs.Timestamp.fromMillis(1) })
    fs.__seed('vehicles/b', { currentOwnerId: 'u1', createdAt: fs.Timestamp.fromMillis(2) })
    const store = useVehicleStore()
    await store.fetchVehicles()
    await store.fetchVehicle('a')
    await store.updateVehicle('a', { color: '黑' } as never)
    expect(store.currentVehicle!.color).toBe('黑')
    expect(store.vehicles.find((v) => v.id === 'a')!.color).toBe('黑')
    await store.reorderVehicles(['a', 'b'])
    expect(store.vehicles.map((v) => [v.id, v.sortOrder])).toEqual([
      ['a', 0],
      ['b', 1],
    ])
    await store.deleteVehicle('a')
    expect(store.vehicles.map((v) => v.id)).toEqual(['b'])
    expect(store.currentVehicle).toBeNull()
  })
})

describe('vehicle transfer callables', () => {
  it('each wrapper sends only its own arguments and returns data', async () => {
    fn.__setCallable('transferVehicleOwnership', () => ({ transactionId: 't', listingId: null }))
    fn.__setCallable('createVehicleTransferInvite', () => ({ code: 'ABCD1234', expiresAt: 1 }))
    fn.__setCallable('peekVehicleTransferInvite', () => ({
      vehicleId: 'v',
      brand: 'B',
      model: 'M',
      manufactureYear: null,
      photo: null,
      fromUser: { displayName: 'Alice', maskedId: 'Ab12******Mn34' },
    }))
    fn.__setCallable('redeemVehicleTransferInvite', () => ({ vehicleId: 'v' }))

    expect(
      await transfer.transferVehicleOwnership({ vehicleId: 'v', buyerVerificationId: 'bv' }),
    ).toEqual({ transactionId: 't', listingId: null })
    expect((await transfer.createVehicleTransferInvite('v')).code).toBe('ABCD1234')
    expect((await transfer.peekVehicleTransferInvite('ABCD1234')).fromUser).toEqual({
      displayName: 'Alice',
      maskedId: 'Ab12******Mn34',
    })
    expect(await transfer.redeemVehicleTransferInvite('ABCD1234')).toEqual({ vehicleId: 'v' })
    expect(fn.calls.map((c) => c.data)).toEqual([
      { vehicleId: 'v', buyerVerificationId: 'bv' },
      { vehicleId: 'v' },
      { code: 'ABCD1234' },
      { code: 'ABCD1234' },
    ])
  })

  it('server-side rejections propagate', async () => {
    fn.__setCallable('redeemVehicleTransferInvite', () => {
      throw Object.assign(new Error('invite expired'), { code: 'functions/failed-precondition' })
    })
    await expect(transfer.redeemVehicleTransferInvite('X')).rejects.toThrow('invite expired')
  })
})

describe('vehicleLogService', () => {
  it('fuel logs: create / list (newest first) / update / delete', async () => {
    const a = await vehicleLogService.createFuelLog({
      vehicleId: 'v',
      refueledAt: 1000,
      mileage: 10,
      liters: 2,
      costTwd: 60,
      fullTank: true,
      note: null,
      recordedBy: 'u1',
    })
    const b = await vehicleLogService.createFuelLog({
      vehicleId: 'v',
      refueledAt: 2000,
      mileage: 50,
      liters: 1,
      costTwd: 30,
      fullTank: false,
      note: undefined as never,
      recordedBy: 'u1',
    })
    expect((await vehicleLogService.listFuelLogs('v')).map((l) => l.id)).toEqual([b, a])
    await vehicleLogService.updateFuelLog('v', a, { refueledAt: 3000, costTwd: 70 })
    const updated = (await vehicleLogService.listFuelLogs('v'))[0]
    expect(updated).toMatchObject({ id: a, refueledAt: 3000, costTwd: 70 })
    await vehicleLogService.deleteFuelLog('v', a)
    expect((await vehicleLogService.listFuelLogs('v')).map((l) => l.id)).toEqual([b])
  })

  it('fuel log defaults: fullTank true, note null', async () => {
    fs.__seed('vehicles/v/fuelLogs/x', { vehicleId: 'v', costTwd: 1, recordedBy: 'u' })
    expect((await vehicleLogService.listFuelLogs('v'))[0]).toMatchObject({
      fullTank: true,
      note: null,
      mileage: null,
      refueledAt: NOW,
    })
  })

  it('maintenance logs: create / list / delete with defaults', async () => {
    const id = await vehicleLogService.createMaintenanceLog({
      vehicleId: 'v',
      servicedAt: 5000,
      mileage: 1000,
      items: [],
      shopName: null,
      totalCostTwd: null,
      note: null,
      receiptUrls: [],
      recordedBy: 'u1',
    } as never)
    fs.__seed('vehicles/v/maintenanceLogs/legacy', {
      vehicleId: 'v',
      servicedAt: fs.Timestamp.fromMillis(1),
      recordedBy: 'u1',
    })
    const list = await vehicleLogService.listMaintenanceLogs('v')
    expect(list.map((l) => l.id)).toEqual([id, 'legacy'])
    expect(list[1]).toMatchObject({ items: [], receiptUrls: [], shopName: null })
    await vehicleLogService.deleteMaintenanceLog('v', id)
    expect(await vehicleLogService.listMaintenanceLogs('v')).toHaveLength(1)
  })
})
