import { useMemo, useState } from 'react'
import Modal from './Modal'
import MetricsSummary from './MetricsSummary'
import type { Trial } from '../types'

interface Row {
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

type SortKey = keyof Omit<Row, 'id'>
type SortDirection = 'asc' | 'desc'

function average(values: number[]): number {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0
}

function toRow(trial: Trial): Row {
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

const COLUMNS: { key: SortKey; label: string; format: (row: Row) => string }[] = [
  { key: 'reedType', label: 'Reed', format: (r) => r.reedType || '—' },
  { key: 'reedStrength', label: 'Strength', format: (r) => r.reedStrength || '—' },
  { key: 'mouthpiece', label: 'Mouthpiece', format: (r) => r.mouthpiece || '—' },
  { key: 'attackTimeMs', label: 'Attack', format: (r) => r.attackTimeMs.toFixed(0) },
  { key: 'centroidHz', label: 'Centroid', format: (r) => r.centroidHz.toFixed(0) },
  { key: 'flatness', label: 'Flatness', format: (r) => r.flatness.toFixed(3) },
  { key: 'oddEven', label: 'Odd/even', format: (r) => (r.oddEven == null ? '—' : r.oddEven.toFixed(3)) },
  {
    key: 'subharmonic',
    label: 'Subharm.',
    format: (r) => (r.subharmonic == null ? '—' : r.subharmonic.toFixed(3)),
  },
  {
    key: 'pitchSpreadCents',
    label: 'Pitch spread',
    format: (r) => (r.pitchSpreadCents == null ? '—' : r.pitchSpreadCents.toFixed(0)),
  },
]

function compareValues(a: Row, b: Row, key: SortKey): number {
  const av = a[key]
  const bv = b[key]
  if (av == null && bv == null) return 0
  if (av == null) return 1
  if (bv == null) return -1
  if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv)
  return (av as number) - (bv as number)
}

function trialTitle(trial: Trial): string {
  const { reedType, reedStrength, mouthpiece } = trial.label
  const reed = [reedType, reedStrength].filter(Boolean).join(' ') || 'Unlabeled reed'
  const date = new Date(trial.timestamp).toLocaleString()
  return mouthpiece ? `${reed} — ${mouthpiece} (${date})` : `${reed} (${date})`
}

interface ComparisonTableProps {
  trials: Trial[]
  onClear: () => void
}

export default function ComparisonTable({ trials, onClear }: ComparisonTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('attackTimeMs')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [selectedTrialId, setSelectedTrialId] = useState<string | null>(null)

  const rows = useMemo(() => trials.map(toRow), [trials])
  const selectedTrial = trials.find((trial) => trial.id === selectedTrialId) ?? null

  const sortedRows = useMemo(() => {
    const sorted = [...rows].sort((a, b) => compareValues(a, b, sortKey))
    return sortDirection === 'asc' ? sorted : sorted.reverse()
  }, [rows, sortKey, sortDirection])

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  return (
    <section className="comparison">
      <div className="comparison-header">
        <h2>Session comparison</h2>
        <button type="button" onClick={onClear} disabled={trials.length === 0}>
          Clear session
        </button>
      </div>

      {trials.length === 0 ? (
        <p className="comparison-empty">No trials recorded yet.</p>
      ) : (
        <div className="comparison-scroll">
          <table className="comparison-table">
            <thead>
              <tr>
                <th></th>
                {COLUMNS.map((col) => (
                  <th key={col.key}>
                    <button type="button" onClick={() => handleSort(col.key)}>
                      {col.label}
                      {sortKey === col.key ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <button type="button" onClick={() => setSelectedTrialId(row.id)}>
                      Graph
                    </button>
                  </td>
                  {COLUMNS.map((col) => (
                    <td key={col.key} title={col.format(row)}>
                      {col.format(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedTrial && (
        <Modal onClose={() => setSelectedTrialId(null)}>
          <h3>{trialTitle(selectedTrial)}</h3>
          <MetricsSummary metrics={selectedTrial.metrics} />
        </Modal>
      )}
    </section>
  )
}
