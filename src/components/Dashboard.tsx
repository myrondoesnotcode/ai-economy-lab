import type { SimulationState } from "../engine/types"
import { StabilityMeter } from "./StabilityMeter"
import { Charts } from "./Charts"
import { EventLog } from "./EventLog"

interface Props {
  history: SimulationState[]
  currentYear: number
}

interface MetricCardProps {
  label: string
  value: string
  sub?: string
  color?: string
  tooltip?: string
}

function MetricCard({ label, value, sub, color, tooltip }: MetricCardProps) {
  return (
    <div className="metric-card" title={tooltip}>
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ color: color ?? "#f9fafb" }}>{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  )
}

export function Dashboard({ history, currentYear }: Props) {
  const latest = history[history.length - 1]

  const unemColor = latest.unemploymentRate > 0.15 ? "#ef4444"
    : latest.unemploymentRate > 0.09 ? "#f97316" : "#22c55e"

  const foodColor = latest.foodPriceIndex > 1.5 ? "#ef4444"
    : latest.foodPriceIndex > 1.2 ? "#f97316" : "#22c55e"

  const gdpColor = latest.gdpIndex < 80 ? "#ef4444"
    : latest.gdpIndex < 95 ? "#f97316" : "#22c55e"

  const ineqColor = latest.inequalityIndex > 2.0 ? "#ef4444"
    : latest.inequalityIndex > 1.4 ? "#f97316" : "#22c55e"

  const stabilityTooltip =
    `Stability = 100 − (unemployment × 1.8) − (food inflation × 0.8) − (inequality deviation × 8.0)\n` +
    `Current breakdown:\n` +
    `  Unemployment penalty: −${(latest.unemploymentRate * 100 * 1.8).toFixed(1)}\n` +
    `  Food price penalty:   −${((latest.foodPriceIndex - 1) * 100 * 0.8).toFixed(1)}\n` +
    `  Inequality penalty:   −${((latest.inequalityIndex - 1.0) * 8.0).toFixed(1)}`

  return (
    <main className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">AI Economy Lab</h1>
        <div className="dashboard-year">Year: <strong>{currentYear}</strong></div>
      </div>

      {/* Top metrics */}
      <div className="metrics-grid">
        <MetricCard
          label="GDP Index"
          value={latest.gdpIndex.toFixed(1)}
          sub="baseline = 100"
          color={gdpColor}
          tooltip="GDP proxy based on employment × wages across all tracked occupations, normalized to year-0 baseline."
        />
        <MetricCard
          label="Unemployment"
          value={`${(latest.unemploymentRate * 100).toFixed(1)}%`}
          sub="structural baseline ~8%"
          color={unemColor}
          tooltip="Share of labor force without tracked employment. ~8% is structural baseline (frictional + untracked sectors). Above 12% indicates AI-driven displacement."
        />
        <MetricCard
          label="Food Price Index"
          value={latest.foodPriceIndex.toFixed(3)}
          sub="baseline = 1.000"
          color={foodColor}
          tooltip="Relative food prices driven by logistics workforce shortfall and energy cost pass-through. 1.0 = baseline; 1.5 = 50% more expensive."
        />
        <MetricCard
          label="Inequality Index"
          value={latest.inequalityIndex.toFixed(2)}
          sub="baseline = 1.00"
          color={ineqColor}
          tooltip="Wage/income dispersion index. Rises when AI displaces routine workers while boosting wages for high-complementarity roles. Corporate concentration amplifies the gap."
        />
      </div>

      <StabilityMeter value={latest.stabilityIndex} tooltip={stabilityTooltip} />

      <Charts history={history} />

      <EventLog events={latest.eventLog} />
    </main>
  )
}
