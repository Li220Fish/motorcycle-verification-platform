export interface ImuSample {
  tMs: number
  ax: number
  ay: number
  az: number
  gx: number
  gy: number
  gz: number
}

export interface ImuSessionJson {
  schemaVersion: number
  sessionType: 'idle' | 'rev'
  durationMs: number
  placement: string
  orientation: string
  targetSampleRateHz: number
  samples: ImuSample[]
}

export interface PreprocessedImu {
  ax: number[]
  ay: number[]
  az: number[]
  gx: number[]
  gy: number[]
  gz: number[]
  tMs: number[]
  sampleCount: number
  effectiveSampleRateHz: number
  missingRatio: number
}

function isFiniteSample(sample: ImuSample): boolean {
  return (
    Number.isFinite(sample.tMs) &&
    Number.isFinite(sample.ax) &&
    Number.isFinite(sample.ay) &&
    Number.isFinite(sample.az) &&
    Number.isFinite(sample.gx) &&
    Number.isFinite(sample.gy) &&
    Number.isFinite(sample.gz)
  )
}

function mean(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

/**
 * raw samples → timestamp/value validation → gravity handling → (no
 * resample in v1 — see below) per Technical spec §41. Gravity handling here
 * is the "simple stable v1 approach" the spec explicitly allows (§42):
 * subtract each axis's own session mean as a crude gravity/orientation
 * offset estimate, rather than a full high-pass filter. Coordinate
 * normalization to a canonical device frame is NOT done in v1 (spec §40
 * flags this as a real gap — device raw axes are trusted as-is here).
 */
export function preprocessImu(raw: ImuSessionJson): PreprocessedImu {
  const valid = raw.samples.filter(isFiniteSample)
  const missingRatio = raw.samples.length > 0 ? 1 - valid.length / raw.samples.length : 1

  const meanAx = mean(valid.map((sample) => sample.ax))
  const meanAy = mean(valid.map((sample) => sample.ay))
  const meanAz = mean(valid.map((sample) => sample.az))

  const durationSec = raw.durationMs / 1000
  const effectiveSampleRateHz = durationSec > 0 ? valid.length / durationSec : 0

  return {
    ax: valid.map((sample) => sample.ax - meanAx),
    ay: valid.map((sample) => sample.ay - meanAy),
    az: valid.map((sample) => sample.az - meanAz),
    gx: valid.map((sample) => sample.gx),
    gy: valid.map((sample) => sample.gy),
    gz: valid.map((sample) => sample.gz),
    tMs: valid.map((sample) => sample.tMs),
    sampleCount: valid.length,
    effectiveSampleRateHz,
    missingRatio,
  }
}
