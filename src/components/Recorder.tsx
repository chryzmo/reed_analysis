import { useEffect, useRef } from 'react'
import { useRecorder } from '../hooks/useRecorder'
import MetricsSummary from './MetricsSummary'
import type { RecorderStatus, Trial, TrialLabel } from '../types'

const STATUS_LABEL: Record<RecorderStatus, string> = {
  idle: 'Idle',
  recording: 'Recording…',
  processing: 'Processing…',
  done: 'Done',
}

interface RecorderProps {
  label: TrialLabel
  onTrialComplete: (trial: Trial) => void
}

export default function Recorder({ label, onTrialComplete }: RecorderProps) {
  const { status, error, audioURL, metrics, start, stop, reset } = useRecorder()

  // The label can keep changing after a take finishes (e.g. while the user
  // edits it before their next take), so it's snapshotted at Record time
  // rather than read live when the trial is reported — otherwise a post-hoc
  // edit would silently relabel a take that already happened.
  const labelAtStartRef = useRef<TrialLabel>(label)
  const handleStart = () => {
    labelAtStartRef.current = label
    start()
  }

  useEffect(() => {
    if (metrics) {
      onTrialComplete({
        id: crypto.randomUUID(),
        label: labelAtStartRef.current,
        timestamp: Date.now(),
        metrics,
      })
    }
    // Intentionally only re-runs when a take's metrics change, not on every
    // label/callback identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrics])

  return (
    <section className="recorder">
      <p className={`status status-${status}`}>{STATUS_LABEL[status]}</p>

      {status === 'idle' && (
        <button type="button" onClick={handleStart}>
          Record
        </button>
      )}
      {status === 'recording' && (
        <button type="button" onClick={stop}>
          Stop
        </button>
      )}
      {status === 'processing' && (
        <button type="button" disabled>
          Stop
        </button>
      )}
      {status === 'done' && (
        <>
          <button type="button" onClick={reset}>
            New take
          </button>
          <audio controls src={audioURL ?? undefined} />
          {metrics && <MetricsSummary metrics={metrics} />}
        </>
      )}

      {error && <p className="error">{error}</p>}
    </section>
  )
}
