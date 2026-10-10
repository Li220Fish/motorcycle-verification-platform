/** Shared short-window slicing — used by both the quality gate and the
 *  feature extractor so "what counts as one analysis window" never drifts
 *  between the two stages. */
export interface AudioWindow {
  samples: Float32Array
  startMs: number
  endMs: number
}

export function sliceWindows(
  samples: Float32Array,
  sampleRateHz: number,
  windowMs: number,
  hopMs: number,
): AudioWindow[] {
  const windowSize = Math.round((windowMs / 1000) * sampleRateHz)
  const hopSize = Math.round((hopMs / 1000) * sampleRateHz)
  if (windowSize <= 0 || hopSize <= 0 || samples.length < windowSize) return []

  const windows: AudioWindow[] = []
  for (let start = 0; start + windowSize <= samples.length; start += hopSize) {
    windows.push({
      samples: samples.subarray(start, start + windowSize),
      startMs: (start / sampleRateHz) * 1000,
      endMs: ((start + windowSize) / sampleRateHz) * 1000,
    })
  }
  return windows
}

export function rms(samples: Float32Array | number[]): number {
  if (samples.length === 0) return 0
  let sumSquares = 0
  for (let i = 0; i < samples.length; i++) sumSquares += samples[i] * samples[i]
  return Math.sqrt(sumSquares / samples.length)
}

export function peakAmplitude(samples: Float32Array): number {
  let peak = 0
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i])
    if (abs > peak) peak = abs
  }
  return peak
}
