export type RecorderStatus = 'idle' | 'recording' | 'processing' | 'done'

// Analysis result for a single take. The first four fields match the
// trial.metrics schema from CLAUDE.md; frameTimestamps/pitchTimestamps are
// extra, chart-only data (pitch timestamps differ from the others because
// unvoiced frames are dropped before charting).
export interface TakeMetrics {
  centroidOverTime: number[]
  pitchStabilityCents: number[]
  attackTimeMs: number
  spectralFlatnessOverTime: number[]
  frameTimestamps: number[]
  pitchTimestamps: number[]
  oddEvenRatioOverTime: number[]
  oddEvenRatioTimestamps: number[]
  subharmonicRatioOverTime: number[]
  subharmonicRatioTimestamps: number[]
}

export interface TrialLabel {
  reedType: string
  reedStrength: string
  mouthpiece: string
}

export interface Trial {
  id: string
  label: TrialLabel
  timestamp: number
  metrics: TakeMetrics
}
