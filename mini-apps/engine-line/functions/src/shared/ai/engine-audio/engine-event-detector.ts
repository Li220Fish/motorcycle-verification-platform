import { EngineAudioConfig } from './engine-audio.config'
import { AudioFeatureTimeline, EngineSessionPhases, WindowFeatures } from './audio-feature-extractor'
import { PresenceAssessment } from './engine-presence-detector'

export const EVENT_DETECTOR_VERSION = 'event-detector-v1'

export type EngineEventType =
  | 'starter_engagement'
  | 'engine_ignition'
  | 'sustained_engine_running'
  | 'engine_stall'
  | 'restart_attempt'
  | 'throttle_increase'
  | 'engine_speed_related_rise'
  | 'engine_speed_related_drop'
  | 'mechanical_tapping'
  | 'sharp_transient'
  | 'irregular_combustion_pattern'

export interface EngineEvent {
  type: EngineEventType
  timeMs: number
  endTimeMs?: number
  confidence: number
}

interface ScoredWindow {
  window: WindowFeatures
  presence: number
}

function zip(timeline: AudioFeatureTimeline, presence: PresenceAssessment): ScoredWindow[] {
  return timeline.windows.map((window, i) => ({
    window,
    presence: presence.windowPresenceProbability[i] ?? 0,
  }))
}

function mean(values: number[]): number {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0
}
function std(values: number[]): number {
  const m = mean(values)
  return values.length ? Math.sqrt(mean(values.map((v) => (v - m) ** 2))) : 0
}

/** Runs of consecutive windows whose presence probability is on the same
 *  side of `threshold` — the basic building block every event below groups
 *  windows with. */
function runsAboveThreshold(scored: ScoredWindow[], threshold: number): ScoredWindow[][] {
  const runs: ScoredWindow[][] = []
  let current: ScoredWindow[] = []
  for (const item of scored) {
    if (item.presence >= threshold) {
      current.push(item)
    } else if (current.length > 0) {
      runs.push(current)
      current = []
    }
  }
  if (current.length > 0) runs.push(current)
  return runs
}

function runDurationMs(run: ScoredWindow[]): number {
  if (run.length === 0) return 0
  return run[run.length - 1].window.endMs - run[0].window.startMs
}

/**
 * Startup-phase transition events: cranking begins (starter_engagement),
 * transitions into a sustained tonal/running sound (engine_ignition →
 * sustained_engine_running), or cranks again without ever reaching that
 * point (restart_attempt) — see spec §12/§14 for the hard rules these feed.
 *
 * Heuristic, not a trained classifier: "cranking" is approximated as audible
 * sound (RMS above the silence floor) that hasn't yet reached the presence-
 * detector's "engine running" threshold; "ignition" is the first window
 * that crosses it. Confidence values reflect how cleanly the signal cleared
 * each threshold, not a calibrated probability.
 */
function detectStartupEvents(
  timeline: AudioFeatureTimeline,
  presence: PresenceAssessment,
  phases: EngineSessionPhases,
  config: EngineAudioConfig,
): EngineEvent[] {
  const scored = zip(timeline, presence).filter(
    ({ window }) => window.startMs >= phases.startup.startMs && window.startMs < phases.startup.endMs,
  )
  const events: EngineEvent[] = []

  // "Audible but not yet running" runs = cranking/starter-engagement segments.
  const audibleButNotRunning = scored.filter(
    ({ window, presence: p }) =>
      window.rms > config.silenceRmsThreshold && p < config.presenceProbabilityThreshold,
  )
  const crankingRuns = runsAboveThreshold(
    audibleButNotRunning.map((item) => ({ ...item, presence: 1 })),
    1,
  )
  let lastCrankEndMs = -Infinity
  for (const run of crankingRuns) {
    const startMs = run[0].window.startMs
    // Two cranking runs separated by a real silence gap count as separate
    // attempts (spec §14); adjacent runs merged by hop-size gaps don't.
    const isNewAttempt = startMs - lastCrankEndMs > config.restartMinGapMs
    events.push({
      type: isNewAttempt && events.some((e) => e.type === 'starter_engagement')
        ? 'restart_attempt'
        : 'starter_engagement',
      timeMs: startMs,
      endTimeMs: run[run.length - 1].window.endMs,
      confidence: Math.min(1, mean(run.map((r) => r.window.rms)) / (config.silenceRmsThreshold * 3)),
    })
    lastCrankEndMs = run[run.length - 1].window.endMs
  }

  const runningRuns = runsAboveThreshold(scored, config.presenceProbabilityThreshold)
  const sustainedRun = runningRuns.find((run) => runDurationMs(run) >= 1000)
  if (sustainedRun) {
    events.push({
      type: 'engine_ignition',
      timeMs: sustainedRun[0].window.startMs,
      confidence: mean(sustainedRun.map((r) => r.presence)),
    })
    events.push({
      type: 'sustained_engine_running',
      timeMs: sustainedRun[0].window.startMs + 1000,
      confidence: mean(sustainedRun.map((r) => r.presence)),
    })
  }

  return events
}

/**
 * engine_stall (spec §15/§16): a sustained drop from "engine present" back
 * below threshold, lasting at least config.stallMinDurationMs, anywhere
 * after ignition (idle or rev phase). A brief dip shorter than the
 * threshold is treated as normal acoustic variation, not a stall.
 */
function detectStallEvents(
  timeline: AudioFeatureTimeline,
  presence: PresenceAssessment,
  phases: EngineSessionPhases,
  config: EngineAudioConfig,
  hadSustainedRunning: boolean,
): EngineEvent[] {
  if (!hadSustainedRunning) return []
  const scored = zip(timeline, presence).filter(
    ({ window }) => window.startMs >= phases.idle.startMs,
  )
  const events: EngineEvent[] = []
  let dropStart: number | null = null
  let wasRunning = false
  for (const { window, presence: p } of scored) {
    const running = p >= config.presenceProbabilityThreshold
    if (wasRunning && !running && dropStart === null) {
      dropStart = window.startMs
    } else if (running && dropStart !== null) {
      if (window.startMs - dropStart >= config.stallMinDurationMs) {
        events.push({
          type: 'engine_stall',
          timeMs: dropStart,
          endTimeMs: window.startMs,
          confidence: 0.85,
        })
      }
      dropStart = null
    }
    wasRunning = running
  }
  // Dropped out and never recovered before the recording ended.
  if (dropStart !== null) {
    const lastWindow = scored[scored.length - 1]?.window
    if (lastWindow && lastWindow.endMs - dropStart >= config.stallMinDurationMs) {
      events.push({ type: 'engine_stall', timeMs: dropStart, confidence: 0.85 })
    }
  }
  return events
}

/**
 * throttle_increase + engine_speed_related_rise/drop (spec §17): compares
 * the rev phase's energy against the idle phase's own baseline — a real
 * throttle blip should raise RMS/spectral-centroid noticeably above steady
 * idle, not just replicate it.
 */
function detectThrottleEvents(
  timeline: AudioFeatureTimeline,
  phases: EngineSessionPhases,
  config: EngineAudioConfig,
): EngineEvent[] {
  const idleWindows = timeline.windows.filter(
    (w) => w.startMs >= phases.idle.startMs && w.startMs < phases.idle.endMs,
  )
  const revWindows = timeline.windows.filter(
    (w) => w.startMs >= phases.rev.startMs && w.startMs < phases.rev.endMs,
  )
  if (idleWindows.length === 0 || revWindows.length === 0) return []

  const idleBaselineRms = mean(idleWindows.map((w) => w.rms))
  if (idleBaselineRms <= 0) return []

  const events: EngineEvent[] = []
  let peakRatio = 0
  let peakWindow: WindowFeatures | null = null
  for (const w of revWindows) {
    const ratio = w.rms / idleBaselineRms
    if (ratio > peakRatio) {
      peakRatio = ratio
      peakWindow = w
    }
  }
  if (peakWindow && peakRatio >= config.minRevEnergyRatio) {
    events.push({
      type: 'throttle_increase',
      timeMs: peakWindow.startMs,
      confidence: Math.min(1, (peakRatio - 1) / (config.minRevEnergyRatio - 1 || 1)),
    })
    events.push({
      type: 'engine_speed_related_rise',
      timeMs: peakWindow.startMs,
      confidence: Math.min(1, (peakRatio - 1) / (config.minRevEnergyRatio - 1 || 1)),
    })
  }
  // A drop back toward (or below) idle level after the peak, within the rev
  // window itself — e.g. throttle released before the 23s cutoff.
  if (peakWindow) {
    const afterPeak = revWindows.filter((w) => w.startMs > peakWindow!.startMs)
    const dropWindow = afterPeak.find((w) => w.rms < peakWindow!.rms * 0.7)
    if (dropWindow) {
      events.push({
        type: 'engine_speed_related_drop',
        timeMs: dropWindow.startMs,
        confidence: 0.6,
      })
    }
  }
  return events
}

/**
 * sharp_transient / mechanical_tapping / irregular_combustion_pattern: the
 * three genuinely fuzzy "does this sound mechanically healthy" events.
 * `sharp_transient` flags any single window whose spectral flux is a
 * statistical outlier for its phase (mean + 2 std). `mechanical_tapping`
 * looks for at least 3 such outlier spikes recurring at a roughly
 * consistent interval (repetition is the signal, per spec §10/§15 — one
 * loud bump is a transient, a REPEATED one is tapping). `irregular_
 * combustion_pattern` flags a phase whose window-to-window RMS coefficient
 * of variation is unusually high while the engine was still detected as
 * present throughout (ruling out a stall, which is its own event).
 */
function detectAnomalyEvents(
  timeline: AudioFeatureTimeline,
  presence: PresenceAssessment,
  phases: EngineSessionPhases,
  config: EngineAudioConfig,
): EngineEvent[] {
  const events: EngineEvent[] = []
  const scored = zip(timeline, presence)

  for (const phaseBounds of [phases.idle, phases.rev]) {
    const inPhase = scored.filter(
      ({ window }) => window.startMs >= phaseBounds.startMs && window.startMs < phaseBounds.endMs,
    )
    if (inPhase.length < 3) continue

    const fluxValues = inPhase.map(({ window }) => window.spectralFlux)
    const fluxMean = mean(fluxValues)
    const fluxStd = std(fluxValues)
    const outlierThreshold = fluxMean + 2 * fluxStd
    const outliers = inPhase.filter(({ window }) => window.spectralFlux > outlierThreshold && fluxStd > 0)

    for (const { window } of outliers) {
      events.push({ type: 'sharp_transient', timeMs: window.startMs, confidence: 0.6 })
    }
    if (outliers.length >= 3) {
      const gaps: number[] = []
      for (let i = 1; i < outliers.length; i++) {
        gaps.push(outliers[i].window.startMs - outliers[i - 1].window.startMs)
      }
      const gapCv = gaps.length > 0 ? std(gaps) / (mean(gaps) || 1) : Infinity
      // Roughly evenly spaced repeated spikes, not a random scatter.
      if (gapCv < 0.5) {
        events.push({
          type: 'mechanical_tapping',
          timeMs: outliers[0].window.startMs,
          endTimeMs: outliers[outliers.length - 1].window.startMs,
          confidence: 0.55,
        })
      }
    }

    const presentWindows = inPhase.filter(({ presence: p }) => p >= config.presenceProbabilityThreshold)
    if (presentWindows.length === inPhase.length) {
      const rmsValues = inPhase.map(({ window }) => window.rms)
      const rmsMean = mean(rmsValues)
      const rmsCv = rmsMean > 0 ? std(rmsValues) / rmsMean : 0
      if (rmsCv > 0.6) {
        events.push({
          type: 'irregular_combustion_pattern',
          timeMs: inPhase[0].window.startMs,
          endTimeMs: inPhase[inPhase.length - 1].window.endMs,
          confidence: Math.min(1, rmsCv),
        })
      }
    }
  }
  return events
}

/** EngineEventDetector stage (spec §10) — combines the sub-detectors above
 *  into one chronologically-sorted event list.
 *
 *  `assumeAlreadyRunning` — 熱車檢查 (engine-sensor-session.service.ts's
 *  analyzeHotEngineSensorSessionV2) has no Startup phase at all: the rider
 *  just finished 上路, so the engine is already confirmed running by the
 *  time this recording starts. Passing `true` skips detectStartupEvents
 *  entirely (there is no cranking/ignition to detect — assuming any of the
 *  timeline's early windows are actually cranking would be an outright
 *  false claim) and injects a single synthetic `sustained_engine_running`
 *  event at t=0 instead, which is enough on its own for
 *  detectStallEvents/analyzeEnginePhases downstream to treat idle/rev
 *  exactly as they already do for the cold pass — no other stage needs to
 *  know this mode exists. */
export function detectEngineEvents(
  timeline: AudioFeatureTimeline,
  presence: PresenceAssessment,
  phases: EngineSessionPhases,
  config: EngineAudioConfig,
  assumeAlreadyRunning = false,
): EngineEvent[] {
  const startupEvents = assumeAlreadyRunning
    ? [{ type: 'sustained_engine_running' as const, timeMs: 0, confidence: 1 }]
    : detectStartupEvents(timeline, presence, phases, config)
  const hadSustainedRunning = startupEvents.some((e) => e.type === 'sustained_engine_running')
  const events = [
    ...startupEvents,
    ...detectStallEvents(timeline, presence, phases, config, hadSustainedRunning),
    ...detectThrottleEvents(timeline, phases, config),
    ...detectAnomalyEvents(timeline, presence, phases, config),
  ]
  return events.sort((a, b) => a.timeMs - b.timeMs)
}
