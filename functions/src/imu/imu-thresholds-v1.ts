/**
 * v1 EXPERIMENTAL thresholds — none of these are calibrated against a real
 * vehicle dataset yet (Engine Audio/IMU Technical spec §59: "所有 threshold
 * 都是 v1 experimental，需要實車 dataset 校正"). Centralized here rather
 * than inline in the classifier, per spec §58 ("Threshold 必須集中設定，
 * 不要散落 code"). Do not present these as calibrated/validated in any UI.
 */
export const IMU_THRESHOLDS_VERSION = 'imu-thresholds-v1'

export const IMU_THRESHOLDS = {
  minSampleCount: 50,
  minEffectiveSampleRateHz: 20,
  maxMissingRatio: 0.3,
  /** Gyroscope peak-to-peak magnitude (deg/s) above this suggests the phone
   *  itself was picked up/rotated, not engine vibration (spec §53/§54). */
  gyroMovementPeakToPeak: 60,
  /** Accelerometer RMS coefficient-of-variation across 1-second windows,
   *  above which a session is read as "not stable" (spec §45/§49-51: idle
   *  should stay steady; rev naturally varies more with throttle input, so
   *  it gets a looser threshold). */
  idleUnstableRmsCv: 0.35,
  revUnstableRmsCv: 0.55,
}
