import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useColorScheme } from '../../hooks/useColorScheme'

export interface ChartColor {
  light: string
  dark: string
}

export interface ChartDatum {
  t: number
  value: number
}

interface MetricLineChartProps {
  data: ChartDatum[]
  color: ChartColor
  unit?: string
  valueFormatter?: (value: number) => string
}

const INK = {
  light: { grid: '#e1e0d9', axis: '#c3c2b7', muted: '#898781', surface: '#fcfcfb', text: '#0b0b0b' },
  dark: { grid: '#2c2c2a', axis: '#383835', muted: '#898781', surface: '#1a1a19', text: '#ffffff' },
}

function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`
}

export default function MetricLineChart({ data, color, unit, valueFormatter }: MetricLineChartProps) {
  const scheme = useColorScheme()
  const ink = INK[scheme]
  const seriesColor = color[scheme]
  const format = valueFormatter || ((v: number) => v.toFixed(1))

  if (data.length === 0) {
    return <p className="chart-empty">No data for this take.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={ink.grid} vertical={false} />
        <XAxis
          dataKey="t"
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={formatSeconds}
          stroke={ink.axis}
          tick={{ fill: ink.muted, fontSize: 12 }}
          tickLine={false}
        />
        <YAxis
          stroke={ink.axis}
          tick={{ fill: ink.muted, fontSize: 12 }}
          tickLine={false}
          width={48}
          tickFormatter={format}
        />
        <Tooltip
          labelFormatter={(label) => formatSeconds(Number(label))}
          formatter={(value) => [`${format(Number(value))}${unit ? ` ${unit}` : ''}`, null]}
          contentStyle={{
            background: ink.surface,
            border: `1px solid ${ink.grid}`,
            color: ink.text,
            fontSize: 12,
          }}
          labelStyle={{ color: ink.muted }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={seriesColor}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
          activeDot={{ r: 4, stroke: ink.surface, strokeWidth: 2, fill: seriesColor }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
