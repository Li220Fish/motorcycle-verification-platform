import { describe, expect, it } from 'vitest'

import { getFlatItems } from '@/data/verification'
import {
  ENGINE_IDLE_ITEM_IDS,
  ENGINE_REV_ITEM_IDS,
  ENGINE_SESSION_DURATION_MS,
  ENGINE_SESSION_INSTRUCTION_SEQUENCE,
  ENGINE_SESSION_ITEM_IDS,
  ENGINE_SESSION_PHASES,
  ENGINE_STARTUP_ITEM_IDS,
  engineSessionInstructionAt,
  HOT_ENGINE_SESSION_DURATION_MS,
  HOT_ENGINE_SESSION_ITEM_IDS,
  HOT_ENGINE_SESSION_PHASES,
  hotEngineSessionInstructionAt,
  inferTransmissionType,
  LOCKED_ENGINE_SECTION_ID,
  LOCKED_HOT_ENGINE_SECTION_ID,
  TRANSMISSION_CHAIN_EXPOSED,
  TRANSMISSION_NO_EXPOSED_CHAIN,
  transmissionLabelFor,
} from '@/data/verification/engine-session'
import {
  buildPhotoSlotItems,
  getPhotoSlotByItemId,
  getRetiredPhotoSlotLabel,
  REQUIRED_PHOTO_SLOTS,
} from '@/data/verification/photo-slots'

describe('photo slots', () => {
  it('slot ids are unique and every slot has a label and description', () => {
    const ids = REQUIRED_PHOTO_SLOTS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const slot of REQUIRED_PHOTO_SLOTS) {
      expect(slot.label).toBeTruthy()
      expect(slot.description).toBeTruthy()
    }
  })

  it('buildPhotoSlotItems prefixes ids and gives optional slots self-disclosure options', () => {
    const items = buildPhotoSlotItems('X')
    expect(items).toHaveLength(REQUIRED_PHOTO_SLOTS.length)
    for (const [i, item] of items.entries()) {
      const slot = REQUIRED_PHOTO_SLOTS[i]
      expect(item.id).toBe(`X-${slot.id}`)
      expect(item.type).toBe('photo')
      expect(item.instruction).toBe(slot.instruction ?? `請拍攝：${slot.label}`)
      expect(item.evidence).toEqual([{ kind: 'photo', label: slot.label, required: slot.required }])
      if (slot.required) expect(item.options).toBeUndefined()
      else
        expect(item.options!.map((o) => o.value)).toEqual(['normal', 'attention', 'not_applicable'])
    }
  })

  it('getPhotoSlotByItemId is prefix-agnostic', () => {
    expect(getPhotoSlotByItemId('APR-left-side')?.id).toBe('left-side')
    expect(getPhotoSlotByItemId('OTHER-left-side')?.id).toBe('left-side')
    expect(getPhotoSlotByItemId('ENG-02')).toBeUndefined()
  })

  it('getRetiredPhotoSlotLabel labels retired slots only', () => {
    expect(getRetiredPhotoSlotLabel('APR-front-suspension')).toContain('舊版項目')
    expect(getRetiredPhotoSlotLabel('APR-left-side')).toBeUndefined()
  })
})

describe('engine session', () => {
  const sellerIds = new Set(getFlatItems('seller').map((f) => f.item.id))
  const buyerIds = new Set(getFlatItems('buyer').map((f) => f.item.id))

  it('inferTransmissionType recognises scooter / manual wording and the gate constants', () => {
    expect(inferTransmissionType(null)).toBeNull()
    expect(inferTransmissionType('')).toBeNull()
    expect(inferTransmissionType(TRANSMISSION_NO_EXPOSED_CHAIN)).toBe('scooter')
    expect(inferTransmissionType(TRANSMISSION_CHAIN_EXPOSED)).toBe('manual')
    expect(inferTransmissionType('CVT 無段變速')).toBe('scooter')
    expect(inferTransmissionType('速克達')).toBe('scooter')
    expect(inferTransmissionType('6速手排')).toBe('manual')
    expect(inferTransmissionType('檔車')).toBe('manual')
    expect(inferTransmissionType('Manual 6-speed')).toBe('manual')
    expect(inferTransmissionType('something else')).toBeNull()
  })

  it('transmissionLabelFor round-trips through inferTransmissionType', () => {
    expect(inferTransmissionType(transmissionLabelFor('scooter'))).toBe('scooter')
    expect(inferTransmissionType(transmissionLabelFor('manual'))).toBe('manual')
  })

  it('cold session covers ENG-03..08 and the items exist in both flows', () => {
    expect([...ENGINE_SESSION_ITEM_IDS].sort()).toEqual(
      [...ENGINE_STARTUP_ITEM_IDS, ...ENGINE_IDLE_ITEM_IDS, ...ENGINE_REV_ITEM_IDS].sort(),
    )
    for (const id of ENGINE_SESSION_ITEM_IDS) {
      expect(sellerIds.has(id), id).toBe(true)
      expect(buyerIds.has(id), id).toBe(true)
    }
  })

  it('hot session items exist only in the buyer flow', () => {
    for (const id of HOT_ENGINE_SESSION_ITEM_IDS) {
      expect(buyerIds.has(id), id).toBe(true)
      expect(sellerIds.has(id), id).toBe(false)
    }
  })

  it('phases are contiguous and end exactly at the session duration', () => {
    expect(ENGINE_SESSION_PHASES.startup.startMs).toBe(0)
    expect(ENGINE_SESSION_PHASES.startup.endMs).toBe(ENGINE_SESSION_PHASES.idle.startMs)
    expect(ENGINE_SESSION_PHASES.idle.endMs).toBe(ENGINE_SESSION_PHASES.rev.startMs)
    expect(ENGINE_SESSION_PHASES.rev.endMs).toBe(ENGINE_SESSION_DURATION_MS)
    expect(HOT_ENGINE_SESSION_PHASES.idle.startMs).toBe(0)
    expect(HOT_ENGINE_SESSION_PHASES.idle.endMs).toBe(HOT_ENGINE_SESSION_PHASES.rev.startMs)
    expect(HOT_ENGINE_SESSION_PHASES.rev.endMs).toBe(HOT_ENGINE_SESSION_DURATION_MS)
  })

  it('on-screen instructions switch at the phase boundaries', () => {
    expect(engineSessionInstructionAt(0)).toBe('請現在發動引擎')
    expect(engineSessionInstructionAt(4.9)).toBe('請現在發動引擎')
    expect(engineSessionInstructionAt(5)).toBe('請保持怠速')
    expect(engineSessionInstructionAt(14)).toBe('請依提示拉動油門')
    expect(engineSessionInstructionAt(999)).toBe('請依提示拉動油門')
    expect(hotEngineSessionInstructionAt(0)).toBe('請保持怠速')
    expect(hotEngineSessionInstructionAt(9)).toBe('請依提示拉動油門')
    for (const step of ENGINE_SESSION_INSTRUCTION_SEQUENCE) expect(step.label).toBeTruthy()
  })

  it('locked section ids match real sections', () => {
    expect(LOCKED_ENGINE_SECTION_ID).toBe('seller-phase3-engine')
    expect(LOCKED_HOT_ENGINE_SECTION_ID).toBe('buyer-hot-check')
  })
})
