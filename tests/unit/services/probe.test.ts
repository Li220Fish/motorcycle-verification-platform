import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MockProbeTransport } from '@/services/probe/mock-probe.service'
import {
  buildProbeEvidence,
  PROBE_EVIDENCE_ITEM_ID,
  readProbeEvidence,
} from '@/services/probe/probe-evidence'
import {
  formatStageValue,
  gradeReading,
  gradeTone,
  parseProbeMessage,
  PROBE_STAGE_TIMEOUT_MS,
  ProbeFrameAssembler,
  toStageResult,
  toStatusReport,
} from '@/services/probe/probe-protocol'
import { ProbeError, probeService } from '@/services/probe/probe.service'
import { useProbeStore } from '@/stores/probe.store'

describe('probe protocol', () => {
  it('reassembles whole, split and back-to-back JSON frames (braces in strings ignored)', () => {
    const assembler = new ProbeFrameAssembler()
    expect(assembler.push('{"status":"OK"}')).toEqual(['{"status":"OK"}'])
    expect(assembler.push('{"stage":"CRANK","message":"請於 {10} ')).toEqual([])
    expect(assembler.push('秒內"}{"status":"BUSY"}')).toEqual([
      '{"stage":"CRANK","message":"請於 {10} 秒內"}',
      '{"status":"BUSY"}',
    ])
    expect(assembler.push('garbage')).toEqual([])
    expect(assembler.push('{"a":"\\"}"}')).toEqual(['{"a":"\\"}"}'])
  })

  it('parses only objects with a status', () => {
    expect(parseProbeMessage('not json')).toBeNull()
    expect(parseProbeMessage('[1]')).toBeNull()
    expect(parseProbeMessage('{"stage":"OCV"}')).toBeNull()
    expect(parseProbeMessage('{"status":"OK","v_in":12.7}')).toEqual({ status: 'OK', v_in: 12.7 })
  })

  it('maps a firmware message to a stage result with its headline value', () => {
    const result = toStageResult('IR', {
      stage: 'IR',
      status: 'OK',
      v_ocv: 12.74,
      r_internal_mohm: 22.9,
      result: 'GOOD',
      judgment: '良好',
      auto_reset: true,
    })
    expect(result).toMatchObject({
      stage: 'IR',
      status: 'OK',
      grade: 'GOOD',
      judgment: '良好',
      primaryValue: 22.9,
      values: { v_ocv: 12.74, r_internal_mohm: 22.9 },
    })
    expect(formatStageValue('IR', 22.9)).toBe('22.9 mΩ')
    expect(formatStageValue('CHARGE', 14.25)).toBe('14.25 V')
    expect(formatStageValue('OCV', null)).toBe('—')
    expect(toStageResult('CRANK', { stage: 'CRANK', status: 'TIMEOUT' }).status).toBe('TIMEOUT')
    expect(toStageResult('OCV', { stage: 'OCV', status: 'ERROR' }).status).toBe('ERROR')
  })

  it('re-grades OK readings with the looser app thresholds; firmware verdict kept in raw', () => {
    const g = (stage: Parameters<typeof gradeReading>[0], m: Record<string, number>) =>
      gradeReading(stage, { status: 'OK', ...m })?.grade
    expect(g('OCV', { v_in: 12.0 })).toBe('GOOD')
    expect(g('OCV', { v_in: 11.9 })).toBe('WARNING')
    expect(g('OCV', { v_in: 11.8 })).toBe('BAD')
    expect(g('IR', { r_internal_mohm: 24.9 })).toBe('GOOD')
    expect(g('IR', { r_internal_mohm: 25 })).toBe('WARNING')
    expect(g('IR', { r_internal_mohm: 40 })).toBe('BAD')
    expect(g('CRANK', { v_min: 9.6 })).toBe('GOOD')
    expect(g('CRANK', { v_min: 8.6 })).toBe('WARNING')
    expect(g('CRANK', { v_min: 8.4 })).toBe('BAD')
    expect(g('CHARGE', { v_charge: 13.3, v_ocv_ref: 12.6 })).toBe('GOOD')
    expect(g('CHARGE', { v_charge: 14.9, v_ocv_ref: 12.6 })).toBe('OVER_CHARGE')
    expect(g('CHARGE', { v_charge: 12.9, v_ocv_ref: 12.6 })).toBe('WEAK_CHARGE')
    expect(g('CHARGE', { v_charge: 12.5, v_ocv_ref: 12.6 })).toBe('NO_CHARGE')
    expect(g('CHARGE', {})).toBeUndefined()

    // Firmware says 8.7V cranking is BAD (<9.0) — the app's looser limit says watch.
    const result = toStageResult('CRANK', {
      stage: 'CRANK',
      status: 'OK',
      v_min: 8.7,
      result: 'BAD',
      judgment: '異常（馬達重拖/電瓶無力）',
    })
    expect(result.grade).toBe('WARNING')
    expect(result.judgment).toContain('觀察')
    expect(result.raw.result).toBe('BAD')
    // Errors are never re-graded.
    const error = toStageResult('OCV', {
      stage: 'OCV',
      status: 'ERROR',
      code: 'PROBE_DISCONNECTED',
      v_in: 0.81,
      judgment: '探針未夾緊或斷路',
    })
    expect(error).toMatchObject({ status: 'ERROR', grade: null, judgment: '探針未夾緊或斷路' })
  })

  it('parses a STATUS_REPORT (exact shape from the real probe)', () => {
    const report = toStatusReport(
      parseProbeMessage(
        '{"type":"STATUS_REPORT","status":"OK","current_stage":"IDLE","is_busy":false,"stage_desc":"待機中（等待手機指令）","probe_connected":false,"v_live":0.993,"v_ocv_baseline":12.600}',
      )!,
    )
    expect(report).toEqual({
      currentStage: 'IDLE',
      isBusy: false,
      clipsOnBattery: false,
      liveVoltage: 0.993,
      baselineOcv: 12.6,
    })
    expect(toStatusReport({ status: 'OK', stage: 'OCV' })).toBeNull()
  })

  it('tones', () => {
    expect(gradeTone(null)).toBe('neutral')
    expect(gradeTone({ status: 'OK', grade: 'GOOD' })).toBe('good')
    expect(gradeTone({ status: 'OK', grade: 'WARNING' })).toBe('warning')
    expect(gradeTone({ status: 'OK', grade: 'WEAK_CHARGE' })).toBe('warning')
    expect(gradeTone({ status: 'OK', grade: 'OVER_CHARGE' })).toBe('bad')
    expect(gradeTone({ status: 'TIMEOUT', grade: null })).toBe('bad')
  })

  it('evidence round-trip keeps the firmware JSON verbatim', () => {
    const result = toStageResult('OCV', {
      stage: 'OCV',
      status: 'OK',
      v_in: 12.742,
      result: 'GOOD',
      judgment: '正常（充飽）',
    })
    const evidence = buildProbeEvidence({
      verificationId: 'v1',
      result,
      session: 'cold',
      deviceName: 'MotoBattery_Probe',
      probeMode: 'ble',
    })
    expect(evidence).toMatchObject({
      itemId: PROBE_EVIDENCE_ITEM_ID,
      type: 'voltage',
      captureSource: 'probe',
    })
    expect(readProbeEvidence(evidence)).toMatchObject({
      stage: 'OCV',
      session: 'cold',
      primaryValue: 12.742,
      firmware: { v_in: 12.742, result: 'GOOD' },
    })
    expect(readProbeEvidence({ ...evidence, metadata: { voltage: 12 } })).toBeNull()
  })
})

describe('mock firmware', () => {
  afterEach(() => vi.useRealTimers())

  it('answers like the ESP32: one stage at a time, BUSY while running, RESET always', async () => {
    vi.useFakeTimers()
    const mock = new MockProbeTransport()
    const frames: Record<string, unknown>[] = []
    mock.onText((text) => frames.push(JSON.parse(text)))
    const connecting = mock.connect()
    await vi.advanceTimersByTimeAsync(300)
    await connecting

    await mock.write('CHARGE')
    await mock.write('OCV')
    expect(frames.map((f) => f.status)).toEqual(['STABILIZING', 'BUSY'])
    await mock.write('RESET')
    expect(frames.at(-1)).toMatchObject({ stage: 'IDLE', status: 'RESET_OK' })
    await vi.advanceTimersByTimeAsync(8000)
    expect(frames).toHaveLength(3) // the reset CHARGE never reports

    await mock.write('nope' as never)
    expect(frames.at(-1)).toMatchObject({ status: 'INVALID_CMD', cmd: 'NOPE' })

    mock.autoCrank = false
    await mock.write('3' as never)
    await vi.advanceTimersByTimeAsync(10000)
    expect(frames.at(-1)).toMatchObject({ stage: 'CRANK', status: 'TIMEOUT' })
    await mock.disconnect()
    await expect(mock.write('OCV')).rejects.toThrow('PROBE_DISCONNECTED')
  })
})

describe('probe client + store (mock transport)', () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    localStorage.clear()
    await probeService.disconnect()
    probeService.setMode('mock')
    probeService.setMockAutoCrank(true)
  })
  afterEach(async () => {
    await probeService.disconnect()
    vi.useRealTimers()
  })

  async function connectedStore() {
    const store = useProbeStore()
    store.setMode('mock')
    const connecting = store.connect()
    await vi.advanceTimersByTimeAsync(300)
    expect(await connecting).toBe(true)
    return store
  }

  it('runs all four stages in order, forwarding progress, and logs both directions', async () => {
    const store = await connectedStore()
    expect(store.connected).toBe(true)
    expect(store.deviceName).toContain('MotoBattery_Probe')

    const ocv = store.runStage('OCV')
    await vi.advanceTimersByTimeAsync(200)
    expect((await ocv).grade).toBe('GOOD')

    const progress: string[] = []
    const crank = probeService.runStage('CRANK', (m) => progress.push(m.status))
    const charge = probeService.runStage('CHARGE', (m) => progress.push(m.status)) // queued
    await vi.advanceTimersByTimeAsync(3000)
    const crankResult = await crank
    expect(crankResult.primaryValue).toBeGreaterThan(9)
    await vi.advanceTimersByTimeAsync(7100)
    expect((await charge).primaryValue).toBeGreaterThan(13.5)
    expect(progress).toEqual(['WAITING_TRIGGER', 'STABILIZING'])

    expect(store.results.OCV?.status).toBe('OK')
    expect(store.log.filter((e) => e.direction === 'tx').map((e) => e.text)).toEqual([
      'OCV',
      'CRANK',
      'CHARGE',
    ])
    store.clearResults()
    expect(store.log).toEqual([])
  })

  it('simulateCrank triggers immediately when auto-crank is off', async () => {
    const store = await connectedStore()
    probeService.setMockAutoCrank(false)
    const crank = store.runStage('CRANK')
    await vi.advanceTimersByTimeAsync(50)
    expect(store.runningStage).toBe('CRANK')
    expect(store.progress?.status).toBe('WAITING_TRIGGER')
    store.simulateCrank()
    await vi.advanceTimersByTimeAsync(1100)
    expect((await crank).status).toBe('OK')
    expect(store.runningStage).toBeNull()
  })

  it('BUSY gets one RESET + resend; RESET mid-stage cancels; no reply → timeout + RESET', async () => {
    const store = await connectedStore()
    // Firmware is busy with a stage this client never asked for.
    const transport = (probeService as unknown as { mock: MockProbeTransport }).mock
    await transport.write('CHARGE')
    const ocv = store.runStage('OCV')
    await vi.advanceTimersByTimeAsync(500)
    expect((await ocv).status).toBe('OK')
    expect(store.log.map((e) => e.text).filter((t) => !t.startsWith('{'))).toEqual([
      'OCV',
      'RESET',
      'OCV',
    ])

    probeService.setMockAutoCrank(false)
    const crank = store.runStage('CRANK')
    await vi.advanceTimersByTimeAsync(50)
    await store.reset()
    await expect(crank).rejects.toMatchObject({ code: 'PROBE_RESET' })

    const write = vi.spyOn(transport, 'write').mockImplementation(async () => {})
    const stuck = store.runStage('IR')
    const assertion = expect(stuck).rejects.toMatchObject({ code: 'PROBE_TIMEOUT' })
    await vi.advanceTimersByTimeAsync(PROBE_STAGE_TIMEOUT_MS.IR + 10)
    await assertion
    expect(write.mock.calls.map((c) => c[0])).toEqual(['IR', 'RESET'])
    expect(store.errorMessage).toBe('PROBE_TIMEOUT')
  })

  it('a dropped link rejects the running stage and marks the store disconnected', async () => {
    const store = await connectedStore()
    const charge = store.runStage('CHARGE')
    const assertion = expect(charge).rejects.toBeInstanceOf(ProbeError)
    await vi.advanceTimersByTimeAsync(100)
    probeService.simulateLinkLoss()
    await assertion
    expect(store.connected).toBe(false)
    expect(store.runningStage).toBeNull()
    await expect(store.runStage('OCV')).rejects.toMatchObject({ code: 'PROBE_DISCONNECTED' })
  })

  it('STATUS: answered over the same link, kept out of the stage log, null on old firmware', async () => {
    const store = await connectedStore()
    const report = store.refreshStatus()
    await vi.advanceTimersByTimeAsync(50)
    expect(await report).toMatchObject({ isBusy: false, clipsOnBattery: true })
    expect(store.statusReport?.liveVoltage).toBeGreaterThan(12)
    expect(store.log).toEqual([])

    const transport = (probeService as unknown as { mock: MockProbeTransport }).mock
    vi.spyOn(transport, 'write').mockImplementation(async () => {})
    const old = probeService.queryStatus(500)
    await vi.advanceTimersByTimeAsync(600)
    expect(await old).toBeNull()
  })

  it('mode is persisted and locked while connected; per-verification choice is persisted', async () => {
    const store = await connectedStore()
    store.setMode('ble')
    expect(store.mode).toBe('mock')
    expect(localStorage.getItem('motoverify:probeMode')).toBe('mock')

    expect(store.choiceFor('v1')).toBeNull()
    expect(store.activeFor('v1')).toBe(false)
    store.setChoice('v1', true)
    expect(store.activeFor('v1')).toBe(true)
    store.setChoice('v2', false)
    expect(localStorage.getItem('motoverify:probeUse:v1')).toBe('yes')
    expect(localStorage.getItem('motoverify:probeUse:v2')).toBe('no')
    localStorage.setItem('motoverify:probeUse:v3', 'yes')
    expect(store.choiceFor('v3')).toBe(true)

    await store.disconnect()
    expect(store.activeFor('v1')).toBe(false)
  })

  it('a cancelled picker is not shown as an error; a real failure is', async () => {
    const store = useProbeStore()
    store.setMode('mock')
    const transport = (probeService as unknown as { mock: MockProbeTransport }).mock
    const connect = vi.spyOn(transport, 'connect')
    connect.mockRejectedValueOnce(new Error('User cancelled the requestDevice() chooser.'))
    expect(await store.connect()).toBe(false)
    expect(store.errorMessage).toBe('')
    connect.mockRejectedValueOnce(new Error('Bluetooth adapter not available'))
    expect(await store.connect()).toBe(false)
    expect(store.errorMessage).toBe('Bluetooth adapter not available')
    expect(store.connectionState).toBe('disconnected')
  })
})
