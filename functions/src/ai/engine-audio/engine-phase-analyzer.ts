import { EngineAudioConfig } from './engine-audio.config'
import { EngineSessionPhases } from './audio-feature-extractor'
import { EngineEvent } from './engine-event-detector'
import { PresenceAssessment } from './engine-presence-detector'

/** Matches spec §9's `phaseAssessment` JSON shape exactly (field names
 *  included) — this is the object persisted verbatim to the Evidence doc's
 *  `metadata.engineAudioV3.phaseAssessment`. */
export interface PhaseValidity {
  valid: boolean
  starterDetected?: boolean
  engineStarted?: boolean
  sustainedRunningReached?: boolean
  multipleStartAttempts?: boolean
  enginePresentRatio?: number
  stallDetected?: boolean
  throttleChangeDetected?: boolean
}

export interface PhaseAssessment {
  startup: PhaseValidity
  idle: PhaseValidity
  rev: PhaseValidity
}

function eventInRange(events: EngineEvent[], type: EngineEvent['type'], bounds: { startMs: number; endMs: number }): boolean {
  return events.some((e) => e.type === type && e.timeMs >= bounds.startMs && e.timeMs < bounds.endMs)
}

/**
 * EnginePhaseAnalyzer stage (spec §9) — combines presence ratios (engine-
 * presence-detector.ts) and detected events (engine-event-detector.ts) into
 * a per-phase validity verdict. This is the object engine-hard-rule-
 * evaluator.ts reads to decide whether Gemini's own verdict for a phase can
 * even be trusted, or must be overridden outright.
 */
export function analyzeEnginePhases(
  presence: PresenceAssessment,
  events: EngineEvent[],
  phases: EngineSessionPhases,
  config: EngineAudioConfig,
): PhaseAssessment {
  const starterDetected = events.some(
    (e) => e.type === 'starter_engagement' || e.type === 'restart_attempt',
  )
  const engineStarted = events.some((e) => e.type === 'engine_ignition')
  const sustainedRunningReached = events.some((e) => e.type === 'sustained_engine_running')
  const multipleStartAttempts = events.some((e) => e.type === 'restart_attempt')

  const startup: PhaseValidity = {
    valid: starterDetected && engineStarted && sustainedRunningReached,
    starterDetected,
    engineStarted,
    sustainedRunningReached,
    multipleStartAttempts,
  }

  const idleStall = eventInRange(events, 'engine_stall', phases.idle)
  const idle: PhaseValidity = {
    valid:
      sustainedRunningReached &&
      !idleStall &&
      presence.phases.idle >= config.minEnginePresenceRatioIdle,
    enginePresentRatio: presence.phases.idle,
    stallDetected: idleStall,
  }

  const revStall = eventInRange(events, 'engine_stall', phases.rev)
  const throttleChangeDetected = events.some((e) => e.type === 'throttle_increase')
  const rev: PhaseValidity = {
    valid:
      sustainedRunningReached &&
      !revStall &&
      throttleChangeDetected &&
      presence.phases.rev >= config.minEnginePresenceRatioRev,
    enginePresentRatio: presence.phases.rev,
    stallDetected: revStall,
    throttleChangeDetected,
  }

  return { startup, idle, rev }
}
