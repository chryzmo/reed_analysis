// Per-frame DSP helpers. Each operates on a single AnalyserNode frame
// (frequency data in dBFS, or time-domain data in [-1, 1]).

const NOISE_FLOOR_DB = -100

// Amplitude-weighted mean frequency of the magnitude spectrum.
export function computeSpectralCentroid(freqDataDb: Float32Array, sampleRate: number): number {
  const binCount = freqDataDb.length
  const nyquist = sampleRate / 2
  let weightedSum = 0
  let magnitudeSum = 0

  for (let i = 0; i < binCount; i++) {
    const db = Math.max(freqDataDb[i], NOISE_FLOOR_DB)
    const magnitude = Math.pow(10, db / 20)
    const freq = (i * nyquist) / binCount
    weightedSum += freq * magnitude
    magnitudeSum += magnitude
  }

  return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0
}

// Geometric mean / arithmetic mean of the magnitude spectrum — near 1 for
// noisy/flat spectra, near 0 for tonal ones.
export function computeSpectralFlatness(freqDataDb: Float32Array): number {
  const binCount = freqDataDb.length
  let logSum = 0
  let sum = 0

  for (let i = 0; i < binCount; i++) {
    const db = Math.max(freqDataDb[i], NOISE_FLOOR_DB)
    const magnitude = Math.pow(10, db / 20) + 1e-12
    logSum += Math.log(magnitude)
    sum += magnitude
  }

  const geometricMean = Math.exp(logSum / binCount)
  const arithmeticMean = sum / binCount
  return arithmeticMean > 0 ? geometricMean / arithmeticMean : 0
}

export function computeRms(timeData: Float32Array): number {
  let sumSquares = 0
  for (let i = 0; i < timeData.length; i++) {
    sumSquares += timeData[i] * timeData[i]
  }
  return Math.sqrt(sumSquares / timeData.length)
}

const QUIET_RMS_THRESHOLD = 0.01
const TRIM_THRESHOLD = 0.2

// Autocorrelation pitch estimate (simplified YIN-style) with parabolic
// interpolation for sub-sample precision. Returns null when the frame is
// too quiet to trust.
export function detectPitch(timeData: Float32Array, sampleRate: number): number | null {
  const size = timeData.length

  let sumSquares = 0
  for (let i = 0; i < size; i++) sumSquares += timeData[i] * timeData[i]
  const rms = Math.sqrt(sumSquares / size)
  if (rms < QUIET_RMS_THRESHOLD) return null

  // Trim leading/trailing near-silence so autocorrelation focuses on the
  // waveform body rather than the quiet edges of the window.
  let start = 0
  let end = size - 1
  while (start < size / 2 && Math.abs(timeData[start]) < TRIM_THRESHOLD) start++
  while (end > size / 2 && Math.abs(timeData[end]) < TRIM_THRESHOLD) end--

  const buf = timeData.subarray(start, end)
  const n = buf.length
  if (n < 2) return null

  const correlations = new Float32Array(n)
  for (let lag = 0; lag < n; lag++) {
    let sum = 0
    for (let i = 0; i < n - lag; i++) sum += buf[i] * buf[i + lag]
    correlations[lag] = sum
  }

  // Skip the initial downslope from the zero-lag peak so we find the first
  // real periodicity peak rather than lag 0 itself.
  let d = 0
  while (d + 1 < n && correlations[d] > correlations[d + 1]) d++

  let maxValue = -Infinity
  let maxLag = -1
  for (let lag = d; lag < n; lag++) {
    if (correlations[lag] > maxValue) {
      maxValue = correlations[lag]
      maxLag = lag
    }
  }
  if (maxLag <= 0) return null

  const prev = maxLag > 0 ? correlations[maxLag - 1] : correlations[maxLag]
  const next = maxLag < n - 1 ? correlations[maxLag + 1] : correlations[maxLag]
  const denom = prev + next - 2 * correlations[maxLag]
  const shift = denom !== 0 ? (prev - next) / (2 * denom) : 0
  const refinedLag = maxLag + shift

  const frequency = sampleRate / refinedLag
  return Number.isFinite(frequency) && frequency > 0 ? frequency : null
}

const HARMONIC_COUNT = 10
const HARMONIC_SEARCH_BINS = 1

// Peak linear magnitude within a small bin window around a target frequency —
// a cheap stand-in for interpolated bin lookup, shared by the harmonic-based
// metrics below.
function magnitudeAtFrequency(freqDataDb: Float32Array, sampleRate: number, targetHz: number): number {
  const binCount = freqDataDb.length
  const nyquist = sampleRate / 2
  if (targetHz <= 0 || targetHz >= nyquist) return 0

  const binWidth = nyquist / binCount
  const centerBin = Math.round(targetHz / binWidth)
  let peakMagnitude = 0
  for (let offset = -HARMONIC_SEARCH_BINS; offset <= HARMONIC_SEARCH_BINS; offset++) {
    const bin = centerBin + offset
    if (bin < 0 || bin >= binCount) continue
    const db = Math.max(freqDataDb[bin], NOISE_FLOOR_DB)
    peakMagnitude = Math.max(peakMagnitude, Math.pow(10, db / 20))
  }
  return peakMagnitude
}

// Fraction of harmonic energy sitting in even-numbered harmonics (2nd, 4th, …)
// versus odd (1st, 3rd, …), estimated by sampling the magnitude spectrum
// around each expected harmonic frequency. A clarinet's cylindrical,
// closed-at-the-reed bore reinforces odd harmonics far more than even ones,
// so this leans toward 0 for a "pure"/stopped-pipe spectrum and rises as
// even-harmonic content leaks in. Requires a detected fundamental (from
// detectPitch) — returns null when there isn't one to build harmonics from.
export function computeOddEvenRatio(
  freqDataDb: Float32Array,
  sampleRate: number,
  fundamentalHz: number,
): number | null {
  if (!fundamentalHz || fundamentalHz <= 0) return null

  const nyquist = sampleRate / 2
  let oddSum = 0
  let evenSum = 0
  let harmonicsFound = 0

  for (let n = 1; n <= HARMONIC_COUNT; n++) {
    const freq = n * fundamentalHz
    if (freq >= nyquist) break

    const magnitude = magnitudeAtFrequency(freqDataDb, sampleRate, freq)
    if (n % 2 === 0) evenSum += magnitude
    else oddSum += magnitude
    harmonicsFound++
  }

  // Need at least the fundamental plus one more harmonic for the ratio to
  // mean anything.
  if (harmonicsFound < 2) return null

  return evenSum / (oddSum + evenSum + 1e-12)
}

const SUBHARMONIC_DIVISORS = [2, 3]

// Energy at f0/2 (and f0/3) relative to the fundamental's own energy — the
// signature of a cane reed briefly vibrating in a period-doubled mode
// ("ghost tones"), most common on bass clarinet's larger, floppier reeds.
// Near 0 means no detectable subharmonic; higher values mean a stronger
// ghost partial relative to the note itself. Requires a detected fundamental
// (from detectPitch) — returns null when there isn't one.
export function computeSubharmonicRatio(
  freqDataDb: Float32Array,
  sampleRate: number,
  fundamentalHz: number,
): number | null {
  if (!fundamentalHz || fundamentalHz <= 0) return null

  const fundamentalMagnitude = magnitudeAtFrequency(freqDataDb, sampleRate, fundamentalHz)
  if (fundamentalMagnitude === 0) return null

  let subharmonicMagnitude = 0
  for (const divisor of SUBHARMONIC_DIVISORS) {
    subharmonicMagnitude += magnitudeAtFrequency(freqDataDb, sampleRate, fundamentalHz / divisor)
  }

  return subharmonicMagnitude / (fundamentalMagnitude + subharmonicMagnitude + 1e-12)
}
