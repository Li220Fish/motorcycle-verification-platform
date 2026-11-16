import { PreprocessedImu } from './imu-preprocessor'
import { IMU_THRESHOLDS } from './imu-thresholds-v1'

export const IMU_FEATURES_VERSION = 'imu-features-v1'

function mean(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}
function std(values: number[]): number {
  const m = mean(values)
  return values.length ? Math.sqrt(mean(values.map((value) => (value - m) ** 2))) : 0
}
function rms(values: number[]): number {
  return values.length ? Math.sqrt(mean(values.map((value) => value * value))) : 0
}
function peakToPeak(values: number[]): number {
  return values.length ? Math.max(...values) - Math.min(...values) : 0
}
function magnitudeSeries(x: number[], y: number[], z: number[]): number[] {
  return x.map((_, i) => Math.sqrt(x[i] ** 2 + y[i] ** 2 + z[i] ** 2))
}

/** 1-second-window RMS/energy coefficient of variation — the spec's actual
 *  primary signal (§45: "真正重要的是時間穩定性...window-to-window
 *  variation...rmsCv, energyCv"), not a cross-vehicle absolute magnitude. */
function windowedCv(
  values: number[],
  tMs: number[],
  windowMs = 1000,
): { rmsCv: number; energyCv: number } {
  const buckets = new Map<number, number[]>()
  for (let i = 0; i < values.length; i++) {
    const bucket = Math.floor(tMs[i] / windowMs)
    if (!buckets.has(bucket)) buckets.set(bucket, [])
    buckets.get(bucket)!.push(values[i])
  }
  const rmsPerWindow: number[] = []
  const energyPerWindow: number[] = []
  for (const values2 of buckets.values()) {
    rmsPerWindow.push(rms(values2))
    energyPerWindow.push(values2.reduce((sum, value) => sum + value * value, 0))
  }
  const cv = (arr: number[]): number => {
    const m = mean(arr)
    return m > 0 ? std(arr) / m : 0
  }
  return { rmsCv: cv(rmsPerWindow), energyCv: cv(energyPerWindow) }
}

/** Direct-sum magnitude spectrum (no FFT dependency — spec §46: "第一版不
 *  需要超複雜", capped to a low-frequency band since engine-vibration
 *  content of interest here is low-frequency, not a full-spectrum NVH
 *  analysis). Cheap enough for one 10-15s session per request. */
function magnitudeSpectrum(
  values: number[],
  sampleRateHz: number,
): { hz: number; power: number }[] {
  if (values.length < 4 || sampleRateHz <= 0) return []
  const n = values.length
  const maxFreq = Math.min(sampleRateHz / 2, 30)
  const spectrum: { hz: number; power: number }[] = []
  for (let f = 0.5; f <= maxFreq; f += 0.5) {
    let re = 0
    let im = 0
    const omega = (2 * Math.PI * f) / sampleRateHz
    for (let i = 0; i < n; i++) {
      re += values[i] * Math.cos(omega * i)
      im -= values[i] * Math.sin(omega * i)
    }
    spectrum.push({ hz: f, power: (re * re + im * im) / n })
  }
  return spectrum
}

function dominantFrequency(spectrum: { hz: number; power: number }[]): number {
  let best = spectrum[0]
  for (const bin of spectrum) if (bin.power > (best?.power ?? -Infinity)) best = bin
  return best?.hz ?? 0
}

function spectralEntropy(spectrum: { hz: number; power: number }[]): number {
  const total = spectrum.reduce((sum, bin) => sum + bin.power, 0)
  if (total <= 0 || spectrum.length === 0) return 0
  const probs = spectrum.map((bin) => bin.power / total).filter((p) => p > 0)
  const entropy = -probs.reduce((sum, p) => sum + p * Math.log2(p), 0)
  return entropy / Math.log2(spectrum.length)
}

export interface ImuFeatureSummary {
  durationMs: number
  accelerometer: {
    rms: number
    std: number
    peakToPeak: number
    rmsCv: number
    dominantFrequencyHz: number
    spectralEntropy: number
  }
  gyroscope: { rms: number; std: number; peakToPeak: number }
  quality: {
    sampleCount: number
    effectiveSampleRateHz: number
    missingRatio: number
    phoneMovementDetected: boolean
  }
}

export function extractImuFeatures(pre: PreprocessedImu, durationMs: number): ImuFeatureSummary {
  const accMagnitude = magnitudeSeries(pre.ax, pre.ay, pre.az)
  const gyroMagnitude = magnitudeSeries(pre.gx, pre.gy, pre.gz)
  const { rmsCv } = windowedCv(accMagnitude, pre.tMs)
  const spectrum = magnitudeSpectrum(accMagnitude, pre.effectiveSampleRateHz)
  const gyroPeakToPeak = peakToPeak(gyroMagnitude)

  return {
    durationMs,
    accelerometer: {
      rms: rms(accMagnitude),
      std: std(accMagnitude),
      peakToPeak: peakToPeak(accMagnitude),
      rmsCv,
      dominantFrequencyHz: dominantFrequency(spectrum),
      spectralEntropy: spectralEntropy(spectrum),
    },
    gyroscope: { rms: rms(gyroMagnitude), std: std(gyroMagnitude), peakToPeak: gyroPeakToPeak },
    quality: {
      sampleCount: pre.sampleCount,
      effectiveSampleRateHz: pre.effectiveSampleRateHz,
      missingRatio: pre.missingRatio,
      // Real device-movement DETECTION (an actual pickup/flip/slide
      // algorithm, Technical spec §53) is explicitly out of scope this pass
      // — see the Engine UI spec's own ban list. This is only a coarse
      // proxy (large gyroscope swing) so a session that's obviously
      // invalid still degrades to `unsure` instead of a false `attention`.
      phoneMovementDetected: gyroPeakToPeak > IMU_THRESHOLDS.gyroMovementPeakToPeak,
    },
  }
}
