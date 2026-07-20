import Modal from './Modal'
import { METRIC_COLUMNS, toTrialRow, trialTitle, type MetricDirection } from '../trialSummary'
import type { Trial } from '../types'

function formatDelta(delta: number, decimals: number): string {
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toFixed(decimals)}`
}

function betterSide(a: number, b: number, direction: MetricDirection): 'a' | 'b' | null {
  if (a === b) return null
  if (direction === 'lowerIsBetter') return a < b ? 'a' : 'b'
  if (direction === 'higherIsBetter') return a > b ? 'a' : 'b'
  return null
}

interface TrialCompareModalProps {
  trialA: Trial
  trialB: Trial
  onClose: () => void
}

export default function TrialCompareModal({ trialA, trialB, onClose }: TrialCompareModalProps) {
  const rowA = toTrialRow(trialA)
  const rowB = toTrialRow(trialB)

  return (
    <Modal onClose={onClose}>
      <h3>Comparing takes</h3>
      <table className="compare-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>{trialTitle(trialA)}</th>
            <th>{trialTitle(trialB)}</th>
            <th>Δ (B − A)</th>
          </tr>
        </thead>
        <tbody>
          {METRIC_COLUMNS.map((col) => {
            const a = rowA[col.key]
            const b = rowB[col.key]
            const bothNumeric = col.numeric && typeof a === 'number' && typeof b === 'number'
            const winner = bothNumeric
              ? betterSide(a as number, b as number, col.direction)
              : null
            const delta = bothNumeric ? formatDelta((b as number) - (a as number), col.decimals) : '—'

            return (
              <tr key={col.key}>
                <td>
                  {col.numeric ? (
                    <span className="metric-tooltip" data-tip={col.description} tabIndex={0}>
                      {col.label}
                    </span>
                  ) : (
                    col.label
                  )}
                </td>
                <td className={winner === 'a' ? 'compare-better' : undefined}>
                  {winner === 'a' && '✓ '}
                  {col.format(rowA)}
                </td>
                <td className={winner === 'b' ? 'compare-better' : undefined}>
                  {winner === 'b' && '✓ '}
                  {col.format(rowB)}
                </td>
                <td>{delta}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Modal>
  )
}
