/**
 * Centralized, versioned config for the Engine Audio v3 pipeline (Decoder →
 * Quality Gate → Preprocessor → Feature Extractor → Presence Detector →
 * Event Detector → Phase Analyzer → Hard Rule Evaluator → Gemini → Result
 * Resolver). Every threshold/window size lives here, never inline in a
 * pipeline stage, so a future recalibration pass touches one file.
 */

export const ENGINE_AUDIO_PIPELINE_VERSIONS = {
  analysisVersion: 'engine-audio-v3',
  // v2: 4th-order 80 Hz high-pass (was one-pole 20 Hz) and RMS normalization
  // (was peak) — both change the numbers downstream stages see, so results
  // produced before and after this are not directly comparable.
  audioPreprocessVersion: 'audio-preprocess-v2',
  // v2: spectrum is FFT-backed and band-aggregated rather than point-sampled
  // by a direct-sum DFT. Same bin layout, different absolute magnitudes.
  audioFeatureVersion: 'audio-feature-v2',
  eventDetectorVersion: 'event-detector-v1',
  transientDetectorVersion: 'transient-detector-v1',
  hardRuleVersion: 'hard-rule-v1',
} as const

export interface EngineAudioConfig {
  /** ffmpeg decode target — matches video-tools.ts's extractPcmAudio. */
  sampleRateHz: number
  /** Short-window size (ms) for RMS/ZCR/spectral feature extraction. */
  windowMs: number
  /** Hop size (ms) between windows — windowMs-hopMs is the overlap. */
  hopMs: number
  /** Highest frequency (Hz) the bin-limited DFT considers — engine acoustic
   *  content of interest (combustion fundamental, valvetrain/timing-chain
   *  tapping harmonics) lives well under this; matches
   *  imu-feature-extractor.ts's "no FFT dependency" convention, just with a
   *  wider band since audio (unlike accelerometer data) has real content up
   *  into the kHz range. */
  maxFrequencyHz: number
  /** Frequency resolution (Hz) of the bin-limited DFT. */
  frequencyBinHz: number
  /** A window's RMS (0-1 normalized scale) at or below this counts as
   *  silence. */
  silenceRmsThreshold: number
  /** Fraction of samples at/near full-scale before a window counts as
   *  clipped. */
  clippingAmplitudeThreshold: number
  /** Recording-level: this much silence anywhere makes the WHOLE recording
   *  unusable (quality gate fails outright, spec §7). */
  maxSilenceRatioForUsable: number
  /** Recording-level: this much clipping anywhere makes the whole recording
   *  unusable. */
  maxClippingRatioForUsable: number
  /** A window's engine-presence probability at/above this counts as
   *  "engine present" when computing a phase's enginePresentRatio. */
  presenceProbabilityThreshold: number
  /**
   * Minimum enginePresentRatio (spec §18's own suggested initial value) for
   * the idle/rev phases to count as valid.
   *
   * ENGINEERING ESTIMATE ONLY — not yet calibrated against a real-vehicle
   * recording dataset (spec §18's own explicit caveat: "未來需要使用
   * MotoVerify 實車 Dataset 校正"). Revisit once real accepted/rejected
   * recordings exist to tune against.
   */
  minEnginePresenceRatioIdle: number
  minEnginePresenceRatioRev: number
  /** Minimum sustained low-presence duration (ms) to call it a stall event,
   *  rather than one brief dip in an otherwise-running engine. */
  stallMinDurationMs: number
  /** Minimum gap (ms) between two starter-engagement events for them to
   *  count as separate restart attempts rather than one continuous crank. */
  restartMinGapMs: number
  /** Minimum energy-ratio jump (rev-window RMS / idle-window RMS) to count
   *  as a real throttle/rev acoustic change (spec §17's "meaningful engine-
   *  speed-related acoustic increase"). */
  minRevEnergyRatio: number
  /** High-pass cutoff (Hz) applied after DC removal — null disables it.
   *
   *  Raised from 20 Hz to 80 Hz, and from a one-pole to a cascaded biquad (see
   *  `highPassStages`), after measuring what the old setting actually removed:
   *  on two real recordings it took the sub-100 Hz share of total energy from
   *  17.05% to 16.59%, and from 27.66% to 26.46% — i.e. effectively nothing. A
   *  one-pole rolls off at only ~6 dB/octave, so a 20 Hz corner leaves handling
   *  thumps and wind rumble almost untouched, and that energy then contaminates
   *  every frequency-domain feature (centroid, flatness, entropy) computed
   *  downstream. The 4th-order 80 Hz setting brings the same recordings to
   *  8.71% and 8.98%. Engine firing fundamentals at idle sit well above this. */
  highPassCutoffHz: number | null
  /** Number of cascaded 2nd-order biquad sections for the high-pass (2 = 4th
   *  order). 1 keeps it gentle; 0 is not valid — use a null cutoff instead. */
  highPassStages: number

  /** How the spectral-analysis copy is scaled.
   *
   *  'peak' (the original) sets the scale of the WHOLE recording from a single
   *  sample. Injecting one 2 ms impulse — a dropped tool, a hand knocking the
   *  phone — into a real recording moved spectralFlux by -46.6% and total band
   *  energy by -47.2%, and those are precisely the features event detection
   *  reads. The same impulse under 'rms' moved them by +1.6% and +0.3%.
   *  Scale-invariant features (centroid, flatness, entropy) are unaffected
   *  either way. */
  normalization: 'peak' | 'rms'
  /** Target RMS for `normalization: 'rms'`. The applied gain is additionally
   *  capped so the result cannot clip. */
  normalizationTargetRms: number

  /** Band-pass (Hz) for the dedicated transient-analysis path — see
   *  transient-detector.ts. 2-8 kHz is where mechanical tapping and knock
   *  sit; idle recordings measured 93% / 83% of their total energy below
   *  500 Hz, which is exactly what drowns these events out when the whole
   *  band is analysed at once. */
  transientBandLowHz: number
  transientBandHighHz: number
  /** Window/hop (ms) for the transient path. Mechanical taps are 5-15 ms
   *  events; the main path's 250 ms window smears them to the point that a
   *  real recording's strongest transient reached only 2.56 robust standard
   *  deviations — below the mean+2*std outlier rule the event detector
   *  applies, i.e. undetectable. At 23 ms the same recording reaches 6.48. */
  transientWindowMs: number
  transientHopMs: number
  /** Robust (MAD-based) z-score a transient window must exceed. */
  transientZThreshold: number
  /** Minimum transient count before the path reports anything at all —
   *  a single outlier in a 9 s phase is not evidence of a mechanical fault. */
  transientMinCount: number

  /** Idle-phase RMS coefficient of variation above which the idle recording is
   *  too unsteady for transient analysis to mean anything. Measured: a steady
   *  real idle scored 0.029 and every detector configuration worked on it; an
   *  unsteady one scored 0.223 and NO configuration could separate injected
   *  taps from the background. ENGINEERING ESTIMATE from two recordings —
   *  needs real-dataset calibration, same caveat as the presence ratios. */
  maxIdleRmsCv: number

  /** How much of the recording's start is treated as "engine not yet running"
   *  and used to measure the ambient noise floor. The fixed capture timeline
   *  (engine-session.ts) always begins before the rider starts the engine. */
  ambientProbeMs: number
  /** Minimum dB the engine must stand above that ambient floor for detail
   *  judgements to be trustworthy. Two real recordings measured 20.5 dB and
   *  25.9 dB of margin. Note this is a QUALITY signal, not a denoising input:
   *  spectral subtraction using this ambient profile was measured to change
   *  the idle harmonic-to-floor ratio by -0.21 dB and +0.03 dB — nothing —
   *  because the engine is 30-36 dB above ambient and the noise that actually
   *  limits it is the engine's own broadband combustion noise. */
  minAmbientMarginDb: number
}

export const ENGINE_AUDIO_CONFIG: EngineAudioConfig = {
  sampleRateHz: 22050,
  windowMs: 250,
  hopMs: 125,
  maxFrequencyHz: 5000,
  frequencyBinHz: 25,
  silenceRmsThreshold: 0.02,
  clippingAmplitudeThreshold: 0.98,
  maxSilenceRatioForUsable: 0.9,
  maxClippingRatioForUsable: 0.3,
  presenceProbabilityThreshold: 0.5,
  minEnginePresenceRatioIdle: 0.7,
  minEnginePresenceRatioRev: 0.7,
  stallMinDurationMs: 800,
  restartMinGapMs: 500,
  minRevEnergyRatio: 1.15,
  highPassCutoffHz: 80,
  highPassStages: 2,
  normalization: 'rms',
  normalizationTargetRms: 0.1,
  // The MAIN feature path deliberately keeps its 5 kHz ceiling. Widening it
  // would change spectralFlatness for every window, and the presence detector
  // weights flatness at 0.4 — a band that is mostly broadband noise above
  // 5 kHz would push presence probabilities down across the board and risk
  // re-deciding "is the engine running" as a side effect of a change aimed at
  // transients. The 2-8 kHz content that matters for tapping/knock is picked
  // up by the separate transient path below instead, where it cannot disturb
  // any existing verdict.
  transientBandLowHz: 2000,
  transientBandHighHz: 8000,
  transientWindowMs: 23,
  transientHopMs: 11,
  transientZThreshold: 6,
  transientMinCount: 3,
  maxIdleRmsCv: 0.15,
  ambientProbeMs: 1000,
  minAmbientMarginDb: 12,
}
