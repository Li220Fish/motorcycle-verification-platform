/**
 * Engine Audio + IMU capture — Verification v2 (spec §23-§33) consolidates
 * the 6 underlying Inspection Items (ENG-03..08) into ONE fixed 23.0-second
 * synchronized Audio+IMU recording (previously 3 separate user-controlled-
 * duration sessions). User Step ≠ Inspection Item still holds: the UI only
 * ever shows one continuous capture screen; the 6 items underneath are
 * unchanged (same ids, same evidence/answer shape) so Review, the
 * lockedOrder gate, and the Report all keep working without special-casing
 * beyond the capture UI itself (see EngineInspectionFlow.vue).
 */
export type EngineTransmissionType = 'scooter' | 'manual'

/** The only two transmission values new listing/vehicle forms write (Task B4
 *  — "有外露鏈條/沒有外露鏈條" Segmented Control replacing free text). Chosen
 *  over the old CVT/manual wording because it matches exactly what the
 *  "傳動／鏈條區域" photo item actually needs to know: is there a chain to
 *  photograph, not what the transmission is technically called. */
export const TRANSMISSION_CHAIN_EXPOSED = '有外露鏈條'
export const TRANSMISSION_NO_EXPOSED_CHAIN = '沒有外露鏈條'

/** Reads Vehicle.transmission to decide scooter-style vs chain-drive photo
 *  prompts. Checks the new canonical Segmented Control values first (exact
 *  match, always reliable); falls back to a best-effort regex guess for
 *  vehicles whose transmission was entered as free text before this pass. */
export function inferTransmissionType(
  transmission: string | null | undefined,
): EngineTransmissionType | null {
  if (!transmission) return null
  if (transmission === TRANSMISSION_NO_EXPOSED_CHAIN) return 'scooter'
  if (transmission === TRANSMISSION_CHAIN_EXPOSED) return 'manual'
  if (/cvt|無段|速克達|scooter/i.test(transmission)) return 'scooter'
  if (/手排|檔車|手動|manual/i.test(transmission)) return 'manual'
  return null
}

/** Written back to Vehicle.transmission when the user picks a type manually
 *  (spec §34: "此選擇應回存合適的 Vehicle / Verification context，而不是只
 *  存在 local UI state") — reuses the existing free-text field rather than
 *  adding a new one, so a future capture on the same vehicle can infer it
 *  automatically instead of asking again. */
export function transmissionLabelFor(type: EngineTransmissionType): string {
  return type === 'scooter' ? 'CVT 無段變速' : '手排'
}

export const ENGINE_STARTUP_ITEM_IDS = ['ENG-03', 'ENG-04'] as const
export const ENGINE_IDLE_ITEM_IDS = ['ENG-05', 'ENG-07'] as const
export const ENGINE_REV_ITEM_IDS = ['ENG-06', 'ENG-08'] as const

/** The full set of items this consolidated flow owns — VerificationStepsView
 *  renders EngineInspectionFlow instead of a plain VerificationItem whenever
 *  the current item's id is one of these. ENG-01 (引擎觸感) and ENG-02
 *  (冷車檢查) are NOT included: the spec explicitly bans touching the cold-
 *  engine flow this pass, so they keep their existing one-item-per-screen UI. */
export const ENGINE_SESSION_ITEM_IDS: string[] = [
  ...ENGINE_STARTUP_ITEM_IDS,
  ...ENGINE_IDLE_ITEM_IDS,
  ...ENGINE_REV_ITEM_IDS,
]

/**
 * Fixed 23.0-second timeline (spec §24/§27) — system truth, never
 * user-adjustable: 0.0-5.0s Startup, 5.0-14.0s Idle, 14.0-23.0s Rev, then
 * auto-stop. Written verbatim as this session's `metadata.phases` on the
 * captured IMU evidence (see EngineInspectionFlow.vue) so the Trusted
 * Backend slices Audio/IMU samples by this SAME boundary rather than
 * re-deriving timing itself (spec §27: "這是 system truth. Gemini / IMU
 * Analyzer 不重新判斷時間區段"). 2026-09: narrowed from 0-8/8-15/15-23 to
 * 0-5/5-14/14-23 — kept in sync with the phase boundaries stated in
 * functions/src/ai/prompts/audio/engine-audio-v2.ts's own fixed timeline
 * (that prompt text is descriptive only; THIS constant is what actually
 * slices the recording/IMU samples on both the client and
 * engine-sensor-session.service.ts).
 */
export const ENGINE_SESSION_DURATION_MS = 23000

export interface EngineSessionPhaseBounds {
  startMs: number
  endMs: number
}
export const ENGINE_SESSION_PHASES: {
  startup: EngineSessionPhaseBounds
  idle: EngineSessionPhaseBounds
  rev: EngineSessionPhaseBounds
} = {
  startup: { startMs: 0, endMs: 5000 },
  idle: { startMs: 5000, endMs: 14000 },
  rev: { startMs: 14000, endMs: 23000 },
}

/** The 3 fixed on-screen instructions for the single 23s session (spec §25). */
export interface EngineSessionInstructionStep {
  atSeconds: number
  label: string
}
export const ENGINE_SESSION_INSTRUCTION_SEQUENCE: EngineSessionInstructionStep[] = [
  { atSeconds: 0, label: '請現在發動引擎' },
  { atSeconds: 5, label: '請保持怠速' },
  { atSeconds: 14, label: '請依提示拉動油門' },
]

export function engineSessionInstructionAt(elapsedSeconds: number): string {
  let current = ENGINE_SESSION_INSTRUCTION_SEQUENCE[0].label
  for (const step of ENGINE_SESSION_INSTRUCTION_SEQUENCE) {
    if (elapsedSeconds >= step.atSeconds) current = step.label
  }
  return current
}

/** The 冷車＋引擎檢查 phase (seller-verification.ts's `seller-phase3-engine`)
 *  — ENG-02 (冷車檢查) + ENG-03..08 (this engine session) together under one
 *  lockedOrder gate: an all-or-nothing unit, once started it must be
 *  finished in one sitting or every item in it is wiped and redone from
 *  scratch (see verification.store.ts's resetLockedEngineSection). Exported
 *  so the store and VerificationStepsView.vue's leave-confirmation guard
 *  reference the exact same id instead of each hardcoding their own copy. */
export const LOCKED_ENGINE_SECTION_ID = 'seller-phase3-engine'

/**
 * 熱車檢查 (buyer-verification.ts's `buyer-hot-check`, HOT-04..07) — Buyer-
 * only, reached after 上路 (RIDE-01). Reuses EngineInspectionFlow.vue's exact
 * consolidated single-recording UI (see that component's `mode` prop), just
 * with a shorter 2-phase timeline: no Startup phase at all, since the engine
 * is already running from the test ride by the time this begins — the rider
 * never "starts" it here, only confirms idle sound/stability then revs it.
 * HOT-01..03 (引擎底部/汽缸頭/排氣端 leak checks) are plain `type: 'check'`
 * items, same as ENG-01, and render through the ordinary VerificationItem
 * path — not part of this consolidated session.
 */
export const HOT_ENGINE_IDLE_ITEM_IDS = ['HOT-04', 'HOT-06'] as const
export const HOT_ENGINE_REV_ITEM_IDS = ['HOT-05', 'HOT-07'] as const
export const HOT_ENGINE_SESSION_ITEM_IDS: string[] = [
  ...HOT_ENGINE_IDLE_ITEM_IDS,
  ...HOT_ENGINE_REV_ITEM_IDS,
]

/** Fixed 18.0-second timeline — same "app alone drives an exact schedule"
 *  discipline as ENGINE_SESSION_DURATION_MS, just 2 phases instead of 3
 *  (5s shorter than the cold session's own idle+rev duration since there's
 *  no ramp-up expected: the engine's already warm and idling steadily). */
export const HOT_ENGINE_SESSION_DURATION_MS = 18000

// Structurally the SAME 3-field shape as ENGINE_SESSION_PHASES (backend's
// EngineSessionPhases type, engine-sensor-session.service.ts's
// EngineSessionImuJson) — `startup` is a zero-width dummy rather than an
// absent field, so the shared DSP pipeline types/functions never need a
// second "startup is optional" shape; every stage that reads
// `phases.startup` naturally computes an empty window set for it and moves
// on (see engine-event-detector.ts's `assumeAlreadyRunning` for how the
// backend actually skips startup DETECTION, as opposed to just feeding it
// an empty phase).
export const HOT_ENGINE_SESSION_PHASES: {
  startup: EngineSessionPhaseBounds
  idle: EngineSessionPhaseBounds
  rev: EngineSessionPhaseBounds
} = {
  startup: { startMs: 0, endMs: 0 },
  idle: { startMs: 0, endMs: 9000 },
  rev: { startMs: 9000, endMs: 18000 },
}

export const HOT_ENGINE_SESSION_INSTRUCTION_SEQUENCE: EngineSessionInstructionStep[] = [
  { atSeconds: 0, label: '請保持怠速' },
  { atSeconds: 9, label: '請依提示拉動油門' },
]

export function hotEngineSessionInstructionAt(elapsedSeconds: number): string {
  let current = HOT_ENGINE_SESSION_INSTRUCTION_SEQUENCE[0].label
  for (const step of HOT_ENGINE_SESSION_INSTRUCTION_SEQUENCE) {
    if (elapsedSeconds >= step.atSeconds) current = step.label
  }
  return current
}

/** Mirrors LOCKED_ENGINE_SECTION_ID's own doc comment — 熱車檢查 is also
 *  `lockedOrder: true` (buyer-verification.ts) and gets the exact same
 *  all-or-nothing leave-mid-way-wipes-it treatment. */
export const LOCKED_HOT_ENGINE_SECTION_ID = 'buyer-hot-check'
