import { applyHannWindow, computeMagnitudeSpectrum } from './dft'
import { EngineAudioConfig } from './engine-audio.config'
import { EngineSessionPhases } from './audio-feature-extractor'
import { sliceWindows } from './windowing'

/**
 * Dedicated transient-analysis pass for mechanical tapping / knock-like
 * events, running beside (never instead of) the main 250 ms feature path.
 *
 * WHY A SECOND PATH EXISTS. The main path cannot see these events, and that is
 * a property of its window length rather than a tuning problem. Measured by
 * injecting synthetic metallic taps (8 ms, resonances at 3.2/4.7/6.3 kHz) at
 * known times into a real idle recording, then scoring each configuration at a
 * matched false-alarm budget:
 *
 *   config                                   recall @ 0 false alarms per phase
 *   0-5 kHz, 250/125 ms  (the main path)                                 0%
 *   0-5 kHz, 46/23 ms    (shorter window only)                           0%
 *   2-8 kHz, 46/23 ms                                                    0%
 *   2-8 kHz, 23/11 ms    (this path)                                  83.3%
 *
 * Note the second row: shortening the window ALONE achieves nothing. A real
 * idle carries 83-93% of its energy below 500 Hz, so without the band-pass the
 * low-frequency bulk dominates every window's spectral flux no matter how
 * short the window is. Band-limiting and shortening are only useful together.
 *
 * WHAT THIS DOES NOT DO. It produces no hard-rule verdict and cannot force any
 * item's result. Its output is descriptive context for Gemini and for the
 * stored analysis record. The thresholds are calibrated against two recordings
 * and synthetic taps, which is enough to show the main path is blind and this
 * one is not, but nowhere near enough to let it overrule a model's reading of
 * the actual audio.
 */

/** Frequency resolution for the transient path. A 23 ms window at 22.05 kHz is
 *  ~507 samples, so the underlying FFT resolves ~43 Hz; asking for finer bins
 *  than that would be inventing detail the window cannot support. */
const TRANSIENT_BIN_HZ = 100

export interface TransientEvent {
  timeMs: number
  /** How far this window's band-limited spectral flux stands above the phase's
   *  own median, in robust (MAD-scaled) standard deviations. */
  z: number
}

export interface TransientPhaseResult {
  /** False when the phase is too unsteady for the measure to mean anything —
   *  every field below is then zero/empty and must not be read as "clean". */
  analyzed: boolean
  notAnalyzedReason: string | null
  windowCount: number
  events: TransientEvent[]
  /** Events spaced regularly enough to look like a recurring mechanical knock
   *  rather than a scatter of one-off bumps. */
  repeating: boolean
  maxZ: number
}

export interface TransientAssessment {
  idle: TransientPhaseResult
  rev: TransientPhaseResult
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function emptyPhase(reason: string | null): TransientPhaseResult {
  return {
    analyzed: reason === null,
    notAnalyzedReason: reason,
    windowCount: 0,
    events: [],
    repeating: false,
    maxZ: 0,
  }
}

/** Band-limited spectral flux per short window. */
function fluxSeries(
  band: Float32Array,
  sampleRateHz: number,
  config: EngineAudioConfig,
): Array<{ startMs: number; flux: number }> {
  const windows = sliceWindows(band, sampleRateHz, config.transientWindowMs, config.transientHopMs)
  const series: Array<{ startMs: number; flux: number }> = []
  let previous: number[] = []
  for (const window of windows) {
    const spectrum = computeMagnitudeSpectrum(
      applyHannWindow(window.samples),
      sampleRateHz,
      config.transientBandHighHz,
      TRANSIENT_BIN_HZ,
    ).filter((bin) => bin.hz >= config.transientBandLowHz)
    const current = spectrum.map((bin) => bin.power)
    let flux = 0
    if (previous.length === current.length) {
      for (let i = 0; i < current.length; i++) {
        const delta = current[i] - previous[i]
        if (delta > 0) flux += delta
      }
    }
    previous = current
    series.push({ startMs: window.startMs, flux })
  }
  // The first window has no predecessor, so its flux is a meaningless 0.
  return series.slice(1)
}

function analyzePhase(
  band: Float32Array,
  sampleRateHz: number,
  bounds: { startMs: number; endMs: number },
  config: EngineAudioConfig,
  skipReason: string | null,
): TransientPhaseResult {
  if (skipReason) return emptyPhase(skipReason)

  const from = Math.max(0, Math.floor((bounds.startMs / 1000) * sampleRateHz))
  const to = Math.min(band.length, Math.floor((bounds.endMs / 1000) * sampleRateHz))
  if (to - from < sampleRateHz * 0.5) return emptyPhase('區段過短，無法分析')

  const series = fluxSeries(band.subarray(from, to), sampleRateHz, config)
  if (series.length < 10) return emptyPhase('有效分析視窗不足')

  const values = series.map((s) => s.flux)
  const med = median(values)
  // MAD rather than standard deviation: the transients being looked for would
  // themselves inflate a standard deviation and so raise their own threshold.
  const mad = median(values.map((v) => Math.abs(v - med)))
  if (mad <= 0) return emptyPhase('訊號無變化，無法建立門檻')

  const scale = 1.4826 * mad
  const events: TransientEvent[] = []
  let maxZ = 0
  for (const point of series) {
    const z = (point.flux - med) / scale
    if (z > maxZ) maxZ = z
    if (z > config.transientZThreshold) {
      events.push({ timeMs: bounds.startMs + point.startMs, z: +z.toFixed(2) })
    }
  }

  let repeating = false
  if (events.length >= config.transientMinCount) {
    const gaps: number[] = []
    for (let i = 1; i < events.length; i++) gaps.push(events[i].timeMs - events[i - 1].timeMs)
    // Consistency is judged against the MEDIAN gap, counting how many gaps
    // agree with it, rather than against the coefficient of variation of all
    // gaps. A real recording almost always carries a few unrelated transients
    // (a real steady idle produced 2 before anything was injected into it),
    // and under a CV test those strays break up an otherwise perfectly regular
    // knock — verified against a real recording, where 8 regular taps plus 2
    // incidental ones failed a CV test despite being plainly periodic.
    const medianGap = median(gaps)
    if (medianGap > 0) {
      const consistent = gaps.filter((gap) => Math.abs(gap - medianGap) <= medianGap * 0.35).length
      repeating = consistent >= config.transientMinCount - 1
    }
  }

  return {
    analyzed: true,
    notAnalyzedReason: null,
    windowCount: series.length,
    events,
    repeating,
    maxZ: +maxZ.toFixed(2),
  }
}

/**
 * `idleRmsCv` comes from the quality analyzer and gates the idle phase: on an
 * unsteady idle (measured 0.223 on a real recording, against 0.029 for a
 * steady one) no detector configuration could separate injected taps from the
 * background at any threshold, so reporting "no transients found" there would
 * be reporting a measurement that was never possible.
 */
export function detectTransients(
  transientBand: Float32Array,
  sampleRateHz: number,
  phases: EngineSessionPhases,
  idleRmsCv: number,
  config: EngineAudioConfig,
): TransientAssessment {
  const idleTooUnsteady =
    idleRmsCv > config.maxIdleRmsCv
      ? `怠速音量起伏過大（變異係數 ${idleRmsCv.toFixed(3)}，門檻 ${config.maxIdleRmsCv}），無法可靠判定異常敲擊`
      : null

  return {
    idle: analyzePhase(transientBand, sampleRateHz, phases.idle, config, idleTooUnsteady),
    rev: analyzePhase(transientBand, sampleRateHz, phases.rev, config, null),
  }
}
