/**
 * Engine Audio + IMU capture — consolidates the 6 underlying Inspection
 * Items (ENG-03..08) into 3 User-facing Sessions (啟動/怠速/油門), per
 * MotoVerify_Engine_Audio_IMU_UI_Agent_Implementation.md. User Step ≠
 * Inspection Item: the UI only ever shows 3 screens; the 6 items underneath
 * are unchanged (same ids, same evidence/answer shape) so Review, the
 * lockedOrder gate, and the Report all keep working without special-casing
 * beyond the grouping itself.
 */
export type EngineTransmissionType = 'scooter' | 'manual'

/** Best-effort read of the existing free-text Vehicle.transmission field —
 *  there's no dedicated vehicle-type enum in the schema, and adding one is
 *  out of scope for this UI/UX-only pass (see the spec's §46 ban list). */
export function inferTransmissionType(
  transmission: string | null | undefined,
): EngineTransmissionType | null {
  if (!transmission) return null
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

/** Simple, adjustable 3-state timing hint for the Rev session (spec §25) —
 *  deliberately NOT a precise RPM/throttle SOP (none exists yet); just a
 *  rough "when to expect what" cue so the capture doesn't feel silent for
 *  10 seconds. Change the `atSeconds` cutoffs here if the real SOP arrives
 *  later — nothing else needs to change. */
export interface RevInstructionStep {
  atSeconds: number
  label: string
}
export const REV_INSTRUCTION_SEQUENCE: RevInstructionStep[] = [
  { atSeconds: 0, label: '保持怠速' },
  { atSeconds: 3, label: '適度轉動油門' },
  { atSeconds: 7, label: '回到怠速' },
]

export function revInstructionAt(elapsedSeconds: number): string {
  let current = REV_INSTRUCTION_SEQUENCE[0].label
  for (const step of REV_INSTRUCTION_SEQUENCE) {
    if (elapsedSeconds >= step.atSeconds) current = step.label
  }
  return current
}
