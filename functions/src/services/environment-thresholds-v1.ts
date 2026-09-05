/**
 * v1 EXPERIMENTAL thresholds — not calibrated against a real capture-session
 * dataset yet, same disclosed-gap posture as `imu-thresholds-v1.ts`.
 * Centralized here rather than inline in the classifier.
 */
export const ENVIRONMENT_THRESHOLDS_VERSION = 'environment-thresholds-v1'

export const ENVIRONMENT_THRESHOLDS = {
  /** Ambient RMS (normalized 0..1) below which noise is "low", below the
   *  next value "moderate", otherwise "high". */
  noiseRmsLow: 0.05,
  noiseRmsModerate: 0.15,
  /** windLikeLowFrequencyEnergy ratio (0..1) thresholds, same 3-tier shape. */
  windEnergyLow: 0.3,
  windEnergyModerate: 0.6,
  /** Above this clipping ratio, audio is flagged unsuitable regardless of
   *  noise level (heavily clipped audio is unusable for later comparison
   *  even if technically "quiet" between clips). */
  maxClippingRatioForSuitable: 0.05,
}
