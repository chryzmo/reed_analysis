import { useMemo, useState } from 'react'
import Modal from './Modal'
import MetricsSummary from './MetricsSummary'
import TrialCompareModal from './TrialCompareModal'
import { METRIC_COLUMNS, toTrialRow, trialTitle, type MetricKey, type TrialRow } from '../trialSummary'
import type { Trial } from '../types'

type SortDirection = 'asc' | 'desc'

function compareValues(a: TrialRow, b: TrialRow, key: MetricKey): number {
  const av = a[key]
  const bv = b[key]
  if (av == null && bv == null) return 0
  if (av == null) return 1
  if (bv == null) return -1
  if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv)
  return (av as number) - (bv as number)
}

interface ComparisonTableProps {
  trials: Trial[]
  onClear: () => void
}

export default function ComparisonTable({ trials, onClear }: ComparisonTableProps) {
  const [sortKey, setSortKey] = useState<MetricKey>('attackTimeMs')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [selectedTrialId, setSelectedTrialId] = useState<string | null>(null)
  const [compareIds, setCompareIds] = useState<string[]>([])

  const rows = useMemo(() => trials.map(toTrialRow), [trials])
  const selectedTrial = trials.find((trial) => trial.id === selectedTrialId) ?? null
  const compareTrials = compareIds
    .map((id) => trials.find((trial) => trial.id === id))
    .filter((trial): trial is Trial => trial != null)

  const sortedRows = useMemo(() => {
    const sorted = [...rows].sort((a, b) => compareValues(a, b, sortKey))
    return sortDirection === 'asc' ? sorted : sorted.reverse()
  }, [rows, sortKey, sortDirection])

  const handleSort = (key: MetricKey) => {
    if (key === sortKey) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((existing) => existing !== id)
      if (prev.length >= 2) return [prev[1], id]
      return [...prev, id]
    })
  }

  return (
    <section className="comparison">
      <div className="comparison-header">
        <h2>Session comparison</h2>
        <button type="button" onClick={onClear} disabled={trials.length === 0}>
          Clear session
        </button>
      </div>
      <p className="comparison-hint">Check two rows to compare them side by side.</p>

      {trials.length === 0 ? (
        <p className="comparison-empty">No trials recorded yet.</p>
      ) : (
        <div className="comparison-scroll">
          <table className="comparison-table">
            <thead>
              <tr>
                <th></th>
                <th></th>
                {METRIC_COLUMNS.map((col) => (
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
                    <input
                      type="checkbox"
                      checked={compareIds.includes(row.id)}
                      onChange={() => toggleCompare(row.id)}
                      aria-label="Select for comparison"
                    />
                  </td>
                  <td>
                    <button type="button" onClick={() => setSelectedTrialId(row.id)}>
                      Graph
                    </button>
                  </td>
                  {METRIC_COLUMNS.map((col) => (
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
          <h3>
            {trialTitle(selectedTrial)} ({new Date(selectedTrial.timestamp).toLocaleString()})
          </h3>
          <MetricsSummary metrics={selectedTrial.metrics} />
        </Modal>
      )}

      {compareTrials.length === 2 && (
        <TrialCompareModal
          trialA={compareTrials[0]}
          trialB={compareTrials[1]}
          onClose={() => setCompareIds([])}
        />
      )}
    </section>
  )
}
