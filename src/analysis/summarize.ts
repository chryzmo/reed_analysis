// Turns raw per-frame series collected during a take into the final
// trial-level metrics.

// Cents deviation of each voiced frame from the take's median pitch.
// Unvoiced frames (no reliable pitch estimate) are dropped rather than
// interpolated, so the matching timestamps are returned alongside the
// values — the result isn't evenly spaced in time like the other series.
export function toCentsDeviation(
  pitchHzSeries: (number | null)[],
  timestamps: number[],
): { cents: number[]; timestamps: number[] } {
  const voicedHz: number[] = []
  const voicedTimestamps: number[] = []
  for (let i = 0; i < pitchHzSeries.length; i++) {
    const hz = pitchHzSeries[i]
    if (hz != null && hz > 0) {
      voicedHz.push(hz)
      voicedTimestamps.push(timestamps[i])
    }
  }
  if (voicedHz.length === 0) return { cents: [], timestamps: [] }

  const sorted = [...voicedHz].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const median =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]

  return {
    cents: voicedHz.map((hz) => 1200 * Math.log2(hz / median)),
    timestamps: voicedTimestamps,
  }
}

// Drops frames with no value (e.g. no fundamental to build harmonics from),
// keeping each remaining value paired with its original timestamp.
export function filterVoiced(
  values: (number | null)[],
  timestamps: number[],
): { values: number[]; timestamps: number[] } {
  const filteredValues: number[] = []
  const filteredTimestamps: number[] = []
  for (let i = 0; i < values.length; i++) {
    const value = values[i]
    if (value != null) {
      filteredValues.push(value)
      filteredTimestamps.push(timestamps[i])
    }
  }
  return { values: filteredValues, timestamps: filteredTimestamps }
}

// Time (ms) between the RMS envelope crossing 10% of its peak (onset) and
// first reaching 90% of its peak (stable).
export function computeAttackTime(rmsSeries: number[], timestamps: number[]): number {
  if (rmsSeries.length === 0) return 0

  const peak = Math.max(...rmsSeries)
  if (peak === 0) return 0

  const onsetThreshold = peak * 0.1
  const stableThreshold = peak * 0.9

  const onsetIndex = rmsSeries.findIndex((v) => v >= onsetThreshold)
  if (onsetIndex === -1) return 0

  let stableIndex = -1
  for (let i = onsetIndex; i < rmsSeries.length; i++) {
    if (rmsSeries[i] >= stableThreshold) {
      stableIndex = i
      break
    }
  }
  if (stableIndex === -1) return 0

  return timestamps[stableIndex] - timestamps[onsetIndex]
}
