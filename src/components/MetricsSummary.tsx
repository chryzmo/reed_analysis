import MetricLineChart, { type ChartColor } from './charts/MetricLineChart'
import type { TakeMetrics } from '../types'

// Fixed identity per metric, held constant across the app rather than
// cycled — see the dataviz skill's categorical-color rule. The first four
// (blue/green/magenta/yellow) are the palette's slots validated as mutually
// distinguishable under full pairwise CVD comparison; red (subharmonic) was
// checked separately and only holds up next to blue in reading order, which
// is why it's placed first in the list, right after the uncolored attack-time
// row.
const CHART_COLORS: Record<'subharmonic' | 'centroid' | 'oddEven' | 'flatness' | 'pitch', ChartColor> = {
  subharmonic: { light: '#e34948', dark: '#e66767' },
  centroid: { light: '#2a78d6', dark: '#3987e5' },
  oddEven: { light: '#008300', dark: '#008300' },
  flatness: { light: '#e87ba4', dark: '#d55181' },
  pitch: { light: '#eda100', dark: '#c98500' },
}

function average(values: number[]): number {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0
}

function zip(values: number[], timestamps: number[]) {
  return values.map((value, i) => ({ t: timestamps[i], value }))
}

export default function MetricsSummary({ metrics }: { metrics: TakeMetrics }) {
  const centsRange = metrics.pitchStabilityCents.length
    ? `${Math.min(...metrics.pitchStabilityCents).toFixed(0)} to ${Math.max(...metrics.pitchStabilityCents).toFixed(0)} cents (${metrics.pitchStabilityCents.length} voiced frames)`
    : 'no pitch detected'

  return (
    <ul className="metrics-summary">
      <li>
        <strong>Attack time:</strong> {metrics.attackTimeMs.toFixed(0)} ms
        <p className="metric-note">
          How long the note takes to speak fully once it starts. Lower usually means a
          more responsive reed/mouthpiece pairing; a sluggish attack can point to a reed
          that's too resistant or a mismatched facing.
        </p>
      </li>
      <li>
        <strong>Subharmonic ratio:</strong>{' '}
        {metrics.subharmonicRatioOverTime.length
          ? average(metrics.subharmonicRatioOverTime).toFixed(3)
          : 'no pitch detected'}
        <p className="metric-note">
          Energy at half (and a third) of the fundamental, relative to the fundamental
          itself — the signature of a cane reed briefly vibrating in a period-doubled
          mode, which is what produces a faint "ghost" pitch under the note. Near 0 means
          no detectable ghost partial; spikes point to a reed prone to this, especially
          worth checking at louder dynamics or awkward fingerings where it's most likely
          to appear.
        </p>
        <MetricLineChart
          data={zip(metrics.subharmonicRatioOverTime, metrics.subharmonicRatioTimestamps)}
          color={CHART_COLORS.subharmonic}
          unit=""
          valueFormatter={(v) => v.toFixed(2)}
        />
      </li>
      <li>
        <strong>Avg spectral centroid:</strong> {average(metrics.centroidOverTime).toFixed(0)} Hz
        <p className="metric-note">
          The "brightness" of the tone — where the energy is centered in the spectrum.
          Higher values sound brighter/edgier, lower values sound darker/warmer. Useful
          for comparing how bright one reed/mouthpiece combo is relative to another.
        </p>
        <MetricLineChart
          data={zip(metrics.centroidOverTime, metrics.frameTimestamps)}
          color={CHART_COLORS.centroid}
          unit="Hz"
          valueFormatter={(v) => v.toFixed(0)}
        />
      </li>
      <li>
        <strong>Avg spectral flatness:</strong>{' '}
        {average(metrics.spectralFlatnessOverTime).toFixed(3)}
        <p className="metric-note">
          A noise proxy from 0 (tonal/focused) to 1 (noisy/flat spectrum). Higher values
          suggest a breathier or airier tone; lower values suggest a cleaner, more
          centered core sound.
        </p>
        <MetricLineChart
          data={zip(metrics.spectralFlatnessOverTime, metrics.frameTimestamps)}
          color={CHART_COLORS.flatness}
          unit=""
          valueFormatter={(v) => v.toFixed(2)}
        />
      </li>
      <li>
        <strong>Odd/even harmonic ratio:</strong>{' '}
        {metrics.oddEvenRatioOverTime.length
          ? average(metrics.oddEvenRatioOverTime).toFixed(3)
          : 'no pitch detected'}
        <p className="metric-note">
          Fraction of harmonic energy sitting in even harmonics (2nd, 4th, …) rather than
          odd. A clarinet's cylindrical bore favors odd harmonics, so lower values read as
          a purer, darker "stopped-pipe" tone; higher values mean more even-harmonic
          content leaking in — often brighter or more complex, and worth watching across
          the break or at louder dynamics where reeds tend to diverge most.
        </p>
        <MetricLineChart
          data={zip(metrics.oddEvenRatioOverTime, metrics.oddEvenRatioTimestamps)}
          color={CHART_COLORS.oddEven}
          unit=""
          valueFormatter={(v) => v.toFixed(2)}
        />
      </li>
      <li>
        <strong>Pitch stability:</strong> {centsRange}
        <p className="metric-note">
          How much the pitch wandered around the take's median, in cents. A tighter range
          means steadier intonation; a wide range can indicate an unstable reed response
          or embouchure fighting the setup.
        </p>
        <MetricLineChart
          data={zip(metrics.pitchStabilityCents, metrics.pitchTimestamps)}
          color={CHART_COLORS.pitch}
          unit="cents"
          valueFormatter={(v) => v.toFixed(0)}
        />
      </li>
    </ul>
  )
}
