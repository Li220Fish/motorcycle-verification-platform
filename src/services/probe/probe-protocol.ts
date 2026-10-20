/**
 * Wire protocol of the MotoBattery_Probe firmware (ESP32, Nordic UART
 * Service). The phone is the sender: it writes one plain-text command to RX,
 * the firmware runs exactly that one stage, notifies JSON on TX, then
 * auto-resets itself back to IDLE. Nothing ever runs without a command.
 *
 * Stage   Command   Engine state     Firmware behaviour
 * 1 OCV   "OCV"     off (冷車)        ~100ms settle, 64x oversampled resting voltage
 * 2 IR    "IR"      off (冷車)        single ~30ms MOSFET pulse, internal resistance
 * 3 CRANK "CRANK"   starting         sends WAITING_TRIGGER, waits ≤10s for <11.5V, captures 1s
 * 4 CHARGE"CHARGE"  running (熱車)    sends STABILIZING, waits 5s, averages 2s
 *   RESET "RESET"   any              manual reset (also accepted while busy)
 *   STATUS"STATUS"  any              STATUS_REPORT: idle/busy, clips on battery, live voltage
 *
 * Grading: the firmware sends its own `result`/`judgment`, but the app
 * re-grades every OK reading from the raw numbers with PROBE_THRESHOLDS
 * below (the looser of the firmware's and the inspection spec's limits), so
 * the verdict is the same whatever firmware version a probe runs. The
 * firmware's own verdict stays in `raw` for traceability.
 */

export const PROBE_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e'
/** Phone → firmware (Write). */
export const PROBE_RX_CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'
/** Firmware → phone (Notify). */
export const PROBE_TX_CHARACTERISTIC_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'
/** Scans only ever list devices whose advertised name starts with this. */
export const PROBE_DEVICE_NAME_PREFIX = 'MotoBattery_Probe'

export type ProbeStage = 'OCV' | 'IR' | 'CRANK' | 'CHARGE'
export type ProbeCommand = ProbeStage | 'RESET' | 'STATUS'

export const PROBE_STAGES: ProbeStage[] = ['OCV', 'IR', 'CRANK', 'CHARGE']

/** Upper bound for one stage, generous over the firmware's own timing so a
 *  slow BLE link never makes a healthy run look like a hang. CRANK = 10s
 *  trigger wait + 1s capture; CHARGE = 5s settle + 2s sampling. */
export const PROBE_STAGE_TIMEOUT_MS: Record<ProbeStage, number> = {
  OCV: 5000,
  IR: 5000,
  CRANK: 16000,
  CHARGE: 14000,
}

/** `status` values the firmware can send. OK/ERROR/TIMEOUT end a stage;
 *  WAITING_TRIGGER/STABILIZING are progress; BUSY/INVALID_CMD reject the
 *  command; RESET_OK acknowledges RESET. */
export type ProbeWireStatus =
  | 'OK'
  | 'ERROR'
  | 'TIMEOUT'
  | 'WAITING_TRIGGER'
  | 'STABILIZING'
  | 'BUSY'
  | 'INVALID_CMD'
  | 'RESET_OK'

/** `result` grade inside an OK message. */
export type ProbeGrade = 'GOOD' | 'WARNING' | 'BAD' | 'OVER_CHARGE' | 'NO_CHARGE' | 'WEAK_CHARGE'

/** One parsed notification, every field optional except status — exactly
 *  what the firmware's snprintf templates can produce. */
export interface ProbeMessage {
  stage?: ProbeStage | 'IDLE'
  status: ProbeWireStatus
  code?: string
  result?: ProbeGrade
  judgment?: string
  message?: string
  auto_reset?: boolean
  v_in?: number
  v_ocv?: number
  v_load?: number
  delta_v_mv?: number
  i_load_a?: number
  r_internal_mohm?: number
  pulse_ms?: number
  v_start?: number
  v_initial?: number
  v_min?: number
  v_drop_diff?: number
  v_charge?: number
  v_ocv_ref?: number
  cmd?: string
  [extra: string]: unknown
}

/** Reply to STATUS (`type: 'STATUS_REPORT'`). `probe_connected` = the clips
 *  read a plausible battery voltage (≥5V), not the BLE link. */
export interface ProbeStatusReport {
  currentStage: string
  isBusy: boolean
  clipsOnBattery: boolean
  liveVoltage: number | null
  baselineOcv: number | null
}

export function toStatusReport(message: ProbeMessage): ProbeStatusReport | null {
  if (message.type !== 'STATUS_REPORT') return null
  const num = (value: unknown): number | null =>
    typeof value === 'number' && Number.isFinite(value) ? value : null
  return {
    currentStage: typeof message.current_stage === 'string' ? message.current_stage : 'IDLE',
    isBusy: message.is_busy === true,
    clipsOnBattery: message.probe_connected === true,
    liveVoltage: num(message.v_live),
    baselineOcv: num(message.v_ocv_baseline),
  }
}

/**
 * App-side grading limits — for each boundary, the looser of the firmware
 * (機車電池量測 Probe 韌體) and the handwritten stage plan:
 *   OCV    normal ≥ 12.0V · low ≥ 11.88V (12V −1%) · else under-voltage
 *   IR     good < 25mΩ · degraded < 40mΩ · else damaged          (same in both)
 *   CRANK  normal ≥ 9.6V · watch ≥ 8.5V · else problem         (firmware: 9.0V)
 *   CHARGE normal 13.2–14.8V · >14.8 over-charge · ≤ resting OCV no charge ·
 *          otherwise weak                                     (firmware: 13.5V)
 */
export const PROBE_THRESHOLDS = {
  ocvGoodV: 12.0,
  ocvLowV: 11.88,
  irGoodMohm: 25,
  irDegradedMohm: 40,
  crankGoodV: 9.6,
  crankWatchV: 8.5,
  chargeMinV: 13.2,
  chargeMaxV: 14.8,
} as const

export function gradeReading(
  stage: ProbeStage,
  message: ProbeMessage,
): { grade: ProbeGrade; judgment: string } | null {
  const T = PROBE_THRESHOLDS
  if (stage === 'OCV' && typeof message.v_in === 'number') {
    const v = message.v_in
    if (v >= T.ocvGoodV) return { grade: 'GOOD', judgment: '正常' }
    if (v >= T.ocvLowV) return { grade: 'WARNING', judgment: '偏低（建議補充電）' }
    return { grade: 'BAD', judgment: '欠壓（過放／老化）' }
  }
  if (stage === 'IR' && typeof message.r_internal_mohm === 'number') {
    const r = message.r_internal_mohm
    if (r < T.irGoodMohm) return { grade: 'GOOD', judgment: '良好' }
    if (r < T.irDegradedMohm) return { grade: 'WARNING', judgment: '衰退（極板硫化）' }
    return { grade: 'BAD', judgment: '損壞（建議更換）' }
  }
  if (stage === 'CRANK' && typeof message.v_min === 'number') {
    const v = message.v_min
    if (v >= T.crankGoodV) return { grade: 'GOOD', judgment: '正常' }
    if (v >= T.crankWatchV) return { grade: 'WARNING', judgment: '觀察（低溫易熄火）' }
    return { grade: 'BAD', judgment: '有問題（馬達重拖／電瓶無力）' }
  }
  if (stage === 'CHARGE' && typeof message.v_charge === 'number') {
    const v = message.v_charge
    const ocv = typeof message.v_ocv_ref === 'number' ? message.v_ocv_ref : null
    if (v > T.chargeMaxV) return { grade: 'OVER_CHARGE', judgment: '過充（整流器異常）' }
    if (v >= T.chargeMinV) return { grade: 'GOOD', judgment: '正常' }
    if (ocv !== null && v <= ocv) return { grade: 'NO_CHARGE', judgment: '未發電（斷路／保險絲）' }
    return { grade: 'WEAK_CHARGE', judgment: '回充迴路老化（充電偏弱）' }
  }
  return null
}

/** A finished stage as the app keeps it (and stores as evidence). */
export interface ProbeStageResult {
  stage: ProbeStage
  status: 'OK' | 'ERROR' | 'TIMEOUT'
  grade: ProbeGrade | null
  judgment: string
  /** The headline number for this stage (V for OCV/CRANK/CHARGE, mΩ for IR). */
  primaryValue: number | null
  /** Every numeric field the firmware sent, verbatim. */
  values: Record<string, number>
  raw: ProbeMessage
  receivedAt: number
}

const TERMINAL_STATUSES: ProbeWireStatus[] = ['OK', 'ERROR', 'TIMEOUT']

export function isTerminalStatus(status: ProbeWireStatus): boolean {
  return TERMINAL_STATUSES.includes(status)
}

export function parseProbeMessage(text: string): ProbeMessage | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object' || typeof (parsed as ProbeMessage).status !== 'string')
    return null
  return parsed as ProbeMessage
}

const PRIMARY_FIELD: Record<ProbeStage, keyof ProbeMessage> = {
  OCV: 'v_in',
  IR: 'r_internal_mohm',
  CRANK: 'v_min',
  CHARGE: 'v_charge',
}

export function toStageResult(stage: ProbeStage, message: ProbeMessage): ProbeStageResult {
  const values: Record<string, number> = {}
  for (const [key, value] of Object.entries(message)) {
    if (typeof value === 'number' && Number.isFinite(value)) values[key] = value
  }
  const primary = message[PRIMARY_FIELD[stage]]
  const status = message.status === 'OK' ? 'OK' : message.status === 'TIMEOUT' ? 'TIMEOUT' : 'ERROR'
  const appGrade = status === 'OK' ? gradeReading(stage, message) : null
  return {
    stage,
    status,
    grade: appGrade?.grade ?? message.result ?? null,
    judgment: appGrade?.judgment ?? message.judgment ?? message.message ?? '',
    primaryValue: typeof primary === 'number' ? primary : null,
    values,
    raw: message,
    receivedAt: Date.now(),
  }
}

export type ProbeTone = 'good' | 'warning' | 'bad' | 'neutral'

/** Shape shared by a live ProbeStageResult and a stored evidence record. */
export interface ProbeReading {
  stage: ProbeStage
  status: ProbeStageResult['status']
  grade: ProbeGrade | null
  judgment: string
  primaryValue: number | null
}

export function gradeTone(
  reading: Pick<ProbeReading, 'status' | 'grade'> | null | undefined,
): ProbeTone {
  if (!reading) return 'neutral'
  if (reading.status !== 'OK') return 'bad'
  if (reading.grade === 'GOOD') return 'good'
  if (reading.grade === 'WARNING' || reading.grade === 'WEAK_CHARGE') return 'warning'
  return 'bad'
}

export function formatStageValue(stage: ProbeStage, value: number | null): string {
  if (value === null) return '—'
  return stage === 'IR' ? `${value.toFixed(1)} mΩ` : `${value.toFixed(2)} V`
}

/**
 * Reassembles notifications into whole JSON objects. A 512-byte MTU normally
 * carries each object in one notification, but a link that negotiated a
 * smaller MTU (or a stack that splits long values) delivers it in pieces —
 * this tracks brace depth, ignoring braces inside strings, and emits each
 * complete top-level object.
 */
export class ProbeFrameAssembler {
  private buffer = ''

  push(chunk: string): string[] {
    this.buffer += chunk
    const frames: string[] = []
    let depth = 0
    let inString = false
    let escaped = false
    let start = -1
    let consumed = 0
    for (let i = 0; i < this.buffer.length; i++) {
      const ch = this.buffer[i]
      if (inString) {
        if (escaped) escaped = false
        else if (ch === '\\') escaped = true
        else if (ch === '"') inString = false
        continue
      }
      if (ch === '"') inString = true
      else if (ch === '{') {
        if (depth === 0) start = i
        depth++
      } else if (ch === '}' && depth > 0) {
        depth--
        if (depth === 0 && start >= 0) {
          frames.push(this.buffer.slice(start, i + 1))
          consumed = i + 1
          start = -1
        }
      }
    }
    this.buffer = depth === 0 ? '' : this.buffer.slice(start >= 0 ? start : consumed)
    // A runaway partial frame (lost closing brace) must not grow forever.
    if (this.buffer.length > 4096) this.buffer = ''
    return frames
  }

  reset(): void {
    this.buffer = ''
  }
}
