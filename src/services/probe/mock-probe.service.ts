import type { ProbeCommand, ProbeStage } from './probe-protocol'
import type { ProbeConnection, ProbeTransport } from './probe-transport'

const round = (value: number, digits: number): number => Number(value.toFixed(digits))
const jitter = (spread: number): number => (Math.random() * 2 - 1) * spread

/**
 * In-memory stand-in for the MotoBattery_Probe firmware — same commands,
 * same JSON shapes, same grading thresholds and roughly the same timing, so
 * the whole app (the /probe page and the probe-assisted engine session) can
 * be exercised without hardware, in a browser without Web Bluetooth, and in
 * unit tests.
 *
 * CRANK auto-triggers ~1.8s after the command (as if the rider pressed the
 * starter), unless `autoCrank` is off — then only simulateCrank() fires it.
 */
export class MockProbeTransport implements ProbeTransport {
  readonly kind = 'mock' as const
  autoCrank = true
  private connected = false
  private busy: ProbeStage | null = null
  private timers: Array<ReturnType<typeof setTimeout>> = []
  private textCallbacks: Array<(text: string) => void> = []
  private disconnectCallbacks: Array<() => void> = []
  private pendingCrank: (() => void) | null = null
  private baselineOcv = 12.6

  async connect(): Promise<ProbeConnection> {
    await new Promise((resolve) => setTimeout(resolve, 300))
    this.connected = true
    return { deviceId: 'mock-probe', name: 'MotoBattery_Probe (模擬)' }
  }

  async disconnect(): Promise<void> {
    this.clearTimers()
    this.busy = null
    this.pendingCrank = null
    this.connected = false
  }

  /** Mock-only: the link drops on its own, like walking out of range. */
  simulateLinkLoss(): void {
    if (!this.connected) return
    void this.disconnect()
    this.disconnectCallbacks.forEach((callback) => callback())
  }

  /** Mock-only: the rider presses the starter during CRANK's 10s window. */
  simulateCrank(): void {
    this.pendingCrank?.()
  }

  async write(command: ProbeCommand): Promise<void> {
    if (!this.connected) throw new Error('PROBE_DISCONNECTED')
    const cmd = command.trim().toUpperCase()
    if (cmd === 'RESET' || cmd === '0') {
      this.clearTimers()
      this.busy = null
      this.pendingCrank = null
      this.emit({ stage: 'IDLE', status: 'RESET_OK', message: '系統已手動重置' })
      return
    }
    if (cmd === 'STATUS' || cmd === '?') {
      this.emit({
        type: 'STATUS_REPORT',
        status: 'OK',
        current_stage: this.busy ?? 'IDLE',
        is_busy: this.busy !== null,
        stage_desc: this.busy ? '量測執行中' : '待機中（等待手機指令）',
        probe_connected: true,
        v_live: round(12.7 + jitter(0.03), 3),
        v_ocv_baseline: this.baselineOcv,
      })
      return
    }
    if (this.busy) {
      this.emit({ status: 'BUSY', message: '量測執行中，請待當前階段自動重置後再發送指令' })
      return
    }
    const stage = ({ '1': 'OCV', '2': 'IR', '3': 'CRANK', '4': 'CHARGE' } as const)[cmd] ?? cmd
    if (stage === 'OCV') this.runOcv()
    else if (stage === 'IR') this.runIr()
    else if (stage === 'CRANK') this.runCrank()
    else if (stage === 'CHARGE') this.runCharge()
    else
      this.emit({
        status: 'INVALID_CMD',
        cmd,
        valid_commands: ['STATUS (?)', 'OCV (1)', 'IR (2)', 'CRANK (3)', 'CHARGE (4)', 'RESET (0)'],
      })
  }

  onText(callback: (text: string) => void): void {
    this.textCallbacks.push(callback)
  }

  onDisconnected(callback: () => void): void {
    this.disconnectCallbacks.push(callback)
  }

  private runOcv(): void {
    this.busy = 'OCV'
    this.later(150, () => {
      const v = round(12.72 + jitter(0.08), 3)
      this.baselineOcv = v
      const [result, judgment] =
        v >= 12.6
          ? ['GOOD', '正常（充飽）']
          : v >= 12.0
            ? ['WARNING', '偏低（需補充電）']
            : ['BAD', '欠壓（過放/老化）']
      this.finish({ stage: 'OCV', status: 'OK', v_in: v, result, judgment, auto_reset: true })
    })
  }

  private runIr(): void {
    this.busy = 'IR'
    this.later(120, () => {
      const vOcv = round(12.72 + jitter(0.05), 3)
      const vLoad = round(vOcv - 0.07 + jitter(0.01), 3)
      const iLoad = round(vLoad / 4.02, 2)
      const r = round(((vOcv - vLoad) / iLoad) * 1000, 1)
      const [result, judgment] =
        r < 25
          ? ['GOOD', '良好']
          : r < 40
            ? ['WARNING', '衰退（極板硫化）']
            : ['BAD', '損壞（建議更換）']
      this.finish({
        stage: 'IR',
        status: 'OK',
        v_ocv: vOcv,
        v_load: vLoad,
        delta_v_mv: round((vOcv - vLoad) * 1000, 1),
        i_load_a: iLoad,
        r_internal_mohm: r,
        pulse_ms: round(29.8 + jitter(0.2), 2),
        result,
        judgment,
        auto_reset: true,
      })
    })
  }

  private runCrank(): void {
    this.busy = 'CRANK'
    const vStart = round(12.68 + jitter(0.04), 2)
    this.emit({
      stage: 'CRANK',
      status: 'WAITING_TRIGGER',
      message: '請於 10 秒內按下機車啟動按鈕',
      v_start: vStart,
    })
    const capture = (): void => {
      this.pendingCrank = null
      this.clearTimers()
      this.later(1000, () => {
        const vMin = round(9.85 + jitter(0.25), 3)
        const [result, judgment] =
          vMin >= 9.6
            ? ['GOOD', '正常']
            : vMin >= 9.0
              ? ['WARNING', '警戒（低溫易熄火）']
              : ['BAD', '異常（馬達重拖/電瓶無力）']
        this.finish({
          stage: 'CRANK',
          status: 'OK',
          v_initial: vStart,
          v_min: vMin,
          v_drop_diff: round(vStart - vMin, 3),
          result,
          judgment,
          auto_reset: true,
        })
      })
    }
    this.pendingCrank = capture
    if (this.autoCrank) this.later(1800, capture)
    this.later(10000, () => {
      if (this.busy !== 'CRANK' || !this.pendingCrank) return
      this.pendingCrank = null
      this.finish({
        stage: 'CRANK',
        status: 'TIMEOUT',
        judgment: '等待發動超時（10秒內未偵測到啟動壓降）',
        auto_reset: true,
      })
    })
  }

  private runCharge(): void {
    this.busy = 'CHARGE'
    this.emit({ stage: 'CHARGE', status: 'STABILIZING', message: '等待 5 秒讓引擎怠速穩定...' })
    this.later(7000, () => {
      const v = round(14.2 + jitter(0.15), 3)
      const [result, judgment] =
        v >= 13.5 && v <= 14.8
          ? ['GOOD', '正常']
          : v > 14.8
            ? ['OVER_CHARGE', '過充危險（整流器擊穿）']
            : v <= this.baselineOcv
              ? ['NO_CHARGE', '未發電（斷路/保險絲燒毀）']
              : ['WEAK_CHARGE', '充電偏弱（回充迴路老化/欠相）']
      this.finish({
        stage: 'CHARGE',
        status: 'OK',
        v_charge: v,
        v_ocv_ref: this.baselineOcv,
        result,
        judgment,
        auto_reset: true,
      })
    })
  }

  private finish(payload: Record<string, unknown>): void {
    this.busy = null
    this.emit(payload)
  }

  private emit(payload: Record<string, unknown>): void {
    const text = JSON.stringify(payload)
    this.textCallbacks.forEach((callback) => callback(text))
  }

  private later(ms: number, fn: () => void): void {
    const handle = setTimeout(() => {
      this.timers = this.timers.filter((timer) => timer !== handle)
      if (this.connected) fn()
    }, ms)
    this.timers.push(handle)
  }

  private clearTimers(): void {
    this.timers.forEach((timer) => clearTimeout(timer))
    this.timers = []
  }
}
