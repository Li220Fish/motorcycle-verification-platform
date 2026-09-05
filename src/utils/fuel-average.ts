/**
 * Full-to-full average fuel consumption (spec §8): segments are the mileage
 * span between one full-tank fill-up and the next. Every litre logged inside
 * a segment (including the closing full-tank entry's own litres, excluding
 * the opening one's — we don't know what happened before the first full
 * tank we see) counts toward that segment's consumption. The overall figure
 * is total distance / total litres across every closed segment, not an
 * average of per-segment ratios, so a long accurate segment isn't diluted by
 * a short noisy one.
 *
 * Worked example from the spec: 10000km full -> 10150km +3.0L partial ->
 * 10350km +4.5L full => 350 / 7.5 = 46.7 km/L.
 */
export interface FuelAverageEntry {
  mileage: number | null
  liters: number | null
  fullTank: boolean
}

export function computeAverageFuelConsumption(logs: FuelAverageEntry[]): number | null {
  const entries = logs
    .filter(
      (log): log is FuelAverageEntry & { mileage: number; liters: number } =>
        log.mileage !== null && log.liters !== null,
    )
    .slice()
    .sort((a, b) => a.mileage - b.mileage)

  let totalDistance = 0
  let totalLiters = 0
  let segmentStart: (typeof entries)[number] | null = null
  let segmentLiters = 0

  for (const entry of entries) {
    if (segmentStart === null) {
      if (entry.fullTank) segmentStart = entry
      continue
    }
    segmentLiters += entry.liters
    if (entry.fullTank) {
      const distance = entry.mileage - segmentStart.mileage
      if (distance > 0 && segmentLiters > 0) {
        totalDistance += distance
        totalLiters += segmentLiters
      }
      segmentStart = entry
      segmentLiters = 0
    }
  }

  if (totalDistance <= 0 || totalLiters <= 0) return null
  return Math.round((totalDistance / totalLiters) * 10) / 10
}
