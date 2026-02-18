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
}

function MetricCard({ label, value, sub, color }: MetricCardProps) {
  return (
    <div className="metric-card">
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
        />
        <MetricCard
          label="Unemployment"
          value={`${(latest.unemploymentRate * 100).toFixed(1)}%`}
          color={unemColor}
        />
        <MetricCard
          label="Food Price Index"
          value={latest.foodPriceIndex.toFixed(3)}
          sub="baseline = 1.000"
          color={foodColor}
        />
        <MetricCard
          label="Inequality Index"
          value={latest.inequalityIndex.toFixed(2)}
          sub="baseline = 1.00"
          color={ineqColor}
        />
      </div>

      <StabilityMeter value={latest.stabilityIndex} />

      <Charts history={history} />

      <EventLog events={latest.eventLog} />
    </main>
  )
}
