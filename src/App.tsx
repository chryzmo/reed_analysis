import { useState } from 'react'
import Recorder from './components/Recorder'
import TrialLabelForm from './components/TrialLabelForm'
import ComparisonTable from './components/ComparisonTable'
import type { Trial, TrialLabel } from './types'

const EMPTY_LABEL: TrialLabel = { reedType: '', reedStrength: '', mouthpiece: '' }

function App() {
  const [label, setLabel] = useState<TrialLabel>(EMPTY_LABEL)
  const [trials, setTrials] = useState<Trial[]>([])

  return (
    <div className="app">
      <h1>Reed/Mouthpiece Analyzer</h1>
      <TrialLabelForm label={label} onChange={setLabel} />
      <Recorder label={label} onTrialComplete={(trial) => setTrials((prev) => [...prev, trial])} />
      <ComparisonTable trials={trials} onClear={() => setTrials([])} />
    </div>
  )
}

export default App
