import type { Trial } from './types'

export interface TrialRow {
  id: string
  reedType: string
  reedStrength: string
  mouthpiece: string
  attackTimeMs: number
  centroidHz: number
  flatness: number
  oddEven: number | null
  subharmonic: number | null
  pitchSpreadCents: number | null
}

export type MetricKey = keyof Omit<TrialRow, 'id'>

function average(values: number[]): number {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0
}

export function toTrialRow(trial: Trial): TrialRow {
  const { label, metrics } = trial
  return {
    id: trial.id,
    reedType: label.reedType,
    reedStrength: label.reedStrength,
    mouthpiece: label.mouthpiece,
    attackTimeMs: metrics.attackTimeMs,
    centroidHz: average(metrics.centroidOverTime),
    flatness: average(metrics.spectralFlatnessOverTime),
    oddEven: metrics.oddEvenRatioOverTime.length ? average(metrics.oddEvenRatioOverTime) : null,
    subharmonic: metrics.subharmonicRatioOverTime.length
      ? average(metrics.subharmonicRatioOverTime)
      : null,
    pitchSpreadCents: metrics.pitchStabilityCents.length
      ? Math.max(...metrics.pitchStabilityCents) - Math.min(...metrics.pitchStabilityCents)
      : null,
  }
}

export type MetricDirection = 'lowerIsBetter' | 'higherIsBetter' | 'neutral'

export interface MetricColumn {
  key: MetricKey
  label: string
  description: string
  format: (row: TrialRow) => string
  numeric: boolean
  decimals: number
  direction: MetricDirection
}

export const METRIC_COLUMNS: MetricColumn[] = [
  {
    key: 'reedType',
    label: 'Reed',
    description: 'Reed type used for this take.',
    numeric: false,
    decimals: 0,
    direction: 'neutral',
    format: (r) => r.reedType || '—',
  },
  {
    key: 'reedStrength',
    label: 'Strength',
    description: 'Reed strength/size used for this take.',
    numeric: false,
    decimals: 0,
    direction: 'neutral',
    format: (r) => r.reedStrength || '—',
  },
  {
    key: 'mouthpiece',
    label: 'Mouthpiece',
    description: 'Mouthpiece used for this take.',
    numeric: false,
    decimals: 0,
    direction: 'neutral',
    format: (r) => r.mouthpiece || '—',
  },
  {
    key: 'attackTimeMs',
    label: 'Attack',
    description:
      'Time for the note to speak fully once it starts, in ms. Lower usually means a more responsive reed/mouthpiece pairing.',
    numeric: true,
    decimals: 0,
    direction: 'lowerIsBetter',
    format: (r) => r.attackTimeMs.toFixed(0),
  },
  {
    key: 'centroidHz',
    label: 'Centroid',
    description:
      'Brightness of the tone — where spectral energy is centered, in Hz. Higher = brighter/edgier, lower = darker/warmer. Not inherently better either way.',
    numeric: true,
    decimals: 0,
    direction: 'neutral',
    format: (r) => r.centroidHz.toFixed(0),
  },
  {
    key: 'flatness',
    label: 'Flatness',
    description:
      'Noise proxy from 0 (tonal/focused) to 1 (noisy/flat spectrum). Lower usually reads as a cleaner, more centered core sound.',
    numeric: true,
    decimals: 3,
    direction: 'lowerIsBetter',
    format: (r) => r.flatness.toFixed(3),
  },
  {
    key: 'oddEven',
    label: 'Odd/even',
    description:
      "Fraction of harmonic energy in even harmonics rather than odd. A clarinet's bore favors odd harmonics, so lower reads as purer/darker, higher as brighter/more complex — not inherently better either way.",
    numeric: true,
    decimals: 3,
    direction: 'neutral',
    format: (r) => (r.oddEven == null ? '—' : r.oddEven.toFixed(3)),
  },
  {
    key: 'subharmonic',
    label: 'Subharm.',
    description:
      "Energy near half/a third of the fundamental — the signature of a reed briefly vibrating in a period-doubled mode (a 'ghost' partial). Lower means less of that artifact.",
    numeric: true,
    decimals: 3,
    direction: 'lowerIsBetter',
    format: (r) => (r.subharmonic == null ? '—' : r.subharmonic.toFixed(3)),
  },
  {
    key: 'pitchSpreadCents',
    label: 'Pitch spread',
    description:
      "Range between the take's highest and lowest pitch deviation, in cents. Lower means steadier intonation.",
    numeric: true,
    decimals: 0,
    direction: 'lowerIsBetter',
    format: (r) => (r.pitchSpreadCents == null ? '—' : r.pitchSpreadCents.toFixed(0)),
  },
]

export function trialTitle(trial: Trial): string {
  const { reedType, reedStrength, mouthpiece } = trial.label
  const reed = [reedType, reedStrength].filter(Boolean).join(' ') || 'Unlabeled reed'
  return mouthpiece ? `${reed} — ${mouthpiece}` : reed
}
