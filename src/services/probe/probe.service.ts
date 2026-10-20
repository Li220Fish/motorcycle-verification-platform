import { BleProbeTransport } from './ble-probe.service'
import { MockProbeTransport } from './mock-probe.service'
import {
  isTerminalStatus,
  parseProbeMessage,
  PROBE_STAGE_TIMEOUT_MS,
  ProbeFrameAssembler,
  toStageResult,
  toStatusReport,
  type ProbeCommand,
  type ProbeMessage,
  type ProbeStage,
  type ProbeStageResult,
  type ProbeStatusReport,
} from './probe-protocol'
import type { ProbeConnection, ProbeTransport } from './probe-transport'

export type ProbeMode = 'ble' | 'mock'

export type ProbeErrorCode =
  'PROBE_DISCONNECTED' | 'PROBE_BUSY' | 'PROBE_INVALID' | 'PROBE_TIMEOUT' | 'PROBE_RESET'

export class ProbeError extends Error {
  readonly code: ProbeErrorCode
  constructor(code: ProbeErrorCode) {
    super(code)
    this.code = code
  }
}

export interface ProbeLogEntry {
  direction: 'tx' | 'rx'
  text: string
  at: number
}

/**
 * The sender side of the probe protocol (see probe-protocol.ts). The firmware
 * runs one stage per command and rejects anything sent mid-stage with BUSY,
 * so every runStage() goes through one queue: send command → forward
 * progress (WAITING_TRIGGER/STABILIZING) → resolve on that stage's
 * OK/ERROR/TIMEOUT. A BUSY reply (firmware still finishing an earlier stage
 * this client already gave up on) gets one RESET + resend; a missing reply
 * past PROBE_STAGE_TIMEOUT_MS sends RESET so the device is IDLE again before
 * the next command.
 */
class ProbeClient {
  private mode: ProbeMode = 'ble'
  private readonly mock = new MockProbeTransport()
  private readonly ble = new BleProbeTransport()
  private connection: ProbeConnection | null = null
  private readonly assembler = new ProbeFrameAssembler()
  private messageListeners = new Set<(message: ProbeMessage) => void>()
  private logListeners = new Set<(entry: ProbeLogEntry) => void>()
  private disconnectListeners = new Set<() => void>()
  private queue: Promise<unknown> = Promise.resolve()

  constructor() {
    for (const transport of [this.mock, this.ble]) {
      transport.onText((text) => {
        if (transport !== this.active || !this.connection) return
        for (const frame of this.assembler.push(text)) {
          this.emitLog({ direction: 'rx', text: frame, at: Date.now() })
          const message = parseProbeMessage(frame)
          if (message) this.messageListeners.forEach((listener) => listener(message))
        }
      })
      transport.onDisconnected(() => {
        if (transport !== this.active || !this.connection) return
        this.connection = null
        this.assembler.reset()
        this.disconnectListeners.forEach((listener) => listener())
      })
    }
  }

  getMode(): ProbeMode {
    return this.mode
  }

  /** Only while disconnected — switching transports under a live link would
   *  orphan it. */
  setMode(mode: ProbeMode): void {
    if (this.connection) return
    this.mode = mode
  }

  isBleSupported(): boolean {
    return BleProbeTransport.isSupported()
  }

  isConnected(): boolean {
    return this.connection !== null
  }

  getConnection(): ProbeConnection | null {
    return this.connection
  }

  private get active(): ProbeTransport {
    return this.mode === 'mock' ? this.mock : this.ble
  }

  async connect(): Promise<ProbeConnection> {
    if (this.connection) return this.connection
    this.assembler.reset()
    this.connection = await this.active.connect()
    return this.connection
  }

  async disconnect(): Promise<void> {
    if (!this.connection) return
    this.connection = null
    this.assembler.reset()
    await this.active.disconnect()
  }

  onMessage(listener: (message: ProbeMessage) => void): () => void {
    this.messageListeners.add(listener)
    return () => this.messageListeners.delete(listener)
  }

  onLog(listener: (entry: ProbeLogEntry) => void): () => void {
    this.logListeners.add(listener)
    return () => this.logListeners.delete(listener)
  }

  onDisconnected(listener: () => void): () => void {
    this.disconnectListeners.add(listener)
    return () => this.disconnectListeners.delete(listener)
  }

  private emitLog(entry: ProbeLogEntry): void {
    this.logListeners.forEach((listener) => listener(entry))
  }

  private async send(command: ProbeCommand): Promise<void> {
    if (!this.connection) throw new ProbeError('PROBE_DISCONNECTED')
    this.emitLog({ direction: 'tx', text: command, at: Date.now() })
    await this.active.write(command)
  }

  /** Fire-and-forget manual reset (also clears a stuck firmware stage). */
  async reset(): Promise<void> {
    await this.send('RESET')
  }

  /** STATUS query — answered immediately, even mid-stage, so it isn't queued
   *  behind runStage(). Resolves null if no STATUS_REPORT arrives in time
   *  (older firmware without STATUS just answers INVALID_CMD). */
  queryStatus(timeoutMs = 2000): Promise<ProbeStatusReport | null> {
    return new Promise((resolve) => {
      const finish = (report: ProbeStatusReport | null): void => {
        clearTimeout(timer)
        off()
        resolve(report)
      }
      const timer = setTimeout(() => finish(null), timeoutMs)
      const off = this.onMessage((message) => {
        const report = toStatusReport(message)
        if (report) finish(report)
        else if (message.status === 'INVALID_CMD' && message.cmd === 'STATUS') finish(null)
      })
      this.send('STATUS').catch(() => finish(null))
    })
  }

  runStage(
    stage: ProbeStage,
    onProgress?: (message: ProbeMessage) => void,
  ): Promise<ProbeStageResult> {
    const run = this.queue.then(() => this.runStageNow(stage, onProgress))
    this.queue = run.catch(() => {})
    return run
  }

  private runStageNow(
    stage: ProbeStage,
    onProgress?: (message: ProbeMessage) => void,
    retried = false,
  ): Promise<ProbeStageResult> {
    return new Promise<ProbeStageResult>((resolve, reject) => {
      let settled = false
      const cleanup = (): void => {
        settled = true
        clearTimeout(timer)
        offMessage()
        offDisconnect()
      }
      const fail = (code: ProbeErrorCode): void => {
        if (settled) return
        cleanup()
        reject(new ProbeError(code))
      }
      const timer = setTimeout(() => {
        fail('PROBE_TIMEOUT')
        this.reset().catch(() => {})
      }, PROBE_STAGE_TIMEOUT_MS[stage])
      const offDisconnect = this.onDisconnected(() => fail('PROBE_DISCONNECTED'))
      const offMessage = this.onMessage((message) => {
        if (settled) return
        if (message.status === 'BUSY') {
          if (retried) return fail('PROBE_BUSY')
          cleanup()
          this.reset()
            .then(() => new Promise((r) => setTimeout(r, 150)))
            .then(() => this.runStageNow(stage, onProgress, true))
            .then(resolve, reject)
          return
        }
        if (message.status === 'INVALID_CMD') return fail('PROBE_INVALID')
        // Someone reset the device mid-stage (cancel, /probe's 重置 button):
        // the firmware abandons the stage, so stop waiting for it instead of
        // holding the queue until the timeout. The BUSY-retry path's own
        // RESET_OK is ignored — it's the reset this run asked for.
        if (message.status === 'RESET_OK') return retried ? undefined : fail('PROBE_RESET')
        if (message.stage !== stage) return
        if (isTerminalStatus(message.status)) {
          cleanup()
          resolve(toStageResult(stage, message))
        } else {
          onProgress?.(message)
        }
      })
      this.send(stage).catch(() => fail('PROBE_DISCONNECTED'))
    })
  }

  /** Mock-only helpers — no-ops against the real probe. */
  simulateCrank(): void {
    if (this.mode === 'mock') this.mock.simulateCrank()
  }

  simulateLinkLoss(): void {
    if (this.mode === 'mock') this.mock.simulateLinkLoss()
  }

  setMockAutoCrank(enabled: boolean): void {
    this.mock.autoCrank = enabled
  }
}

export const probeService = new ProbeClient()
