import type { ChangeEvent } from 'react'
import type { TrialLabel } from '../types'

interface TrialLabelFormProps {
  label: TrialLabel
  onChange: (label: TrialLabel) => void
}

export default function TrialLabelForm({ label, onChange }: TrialLabelFormProps) {
  const update = (field: keyof TrialLabel) => (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...label, [field]: event.target.value })
  }

  return (
    <fieldset className="trial-label-form">
      <legend>Current setup</legend>
      <label>
        Reed type
        <input
          type="text"
          value={label.reedType}
          onChange={update('reedType')}
          placeholder="e.g. V12"
        />
      </label>
      <label>
        Reed strength
        <input
          type="text"
          value={label.reedStrength}
          onChange={update('reedStrength')}
          placeholder="e.g. 3.0"
        />
      </label>
      <label>
        Mouthpiece
        <input
          type="text"
          value={label.mouthpiece}
          onChange={update('mouthpiece')}
          placeholder="e.g. Fobes Nova CF (optional)"
        />
      </label>
    </fieldset>
  )
}
