import type { SimulationState } from "../engine/types"
import { StabilityMeter } from "./StabilityMeter"
import { Charts } from "./Charts"
import { EventLog } from "./EventLog"
import { InfoPanel } from "./InfoPanel"

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
  info?: React.ReactNode
}

function MetricCard({ label, value, sub, color, tooltip, info }: MetricCardProps) {
  return (
    <div className="metric-card" title={tooltip}>
      <div className="metric-card-header">
        <div className="metric-label">{label}</div>
        {info && <div className="metric-info">{info}</div>}
      </div>
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

  const unemploymentPenalty = latest.unemploymentRate * 100 * 1.8
  const foodPenalty = (latest.foodPriceIndex - 1) * 100 * 0.8
  const inequalityPenalty = (latest.inequalityIndex - 1.0) * 8.0

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
          info={
            <InfoPanel title="GDP Index">
              <p>Total economic output as an index, where 100 = the starting year (2025).</p>
              <ul>
                <li><strong>Above 100</strong> — AI productivity gains are outpacing job losses. The economy is growing.</li>
                <li><strong>Below 100</strong> — displacement is shrinking output. Workers who lost their jobs can't spend, which contracts the economy further.</li>
              </ul>
              <p><strong>How it's calculated:</strong> Sum of (workers × wages) across all 25 occupations, divided by the year-one total. It rises when high-skill wages surge, even if many people are unemployed — so a high GDP doesn't necessarily mean widespread prosperity.</p>
            </InfoPanel>
          }
        />
        <MetricCard
          label="Unemployment"
          value={`${(latest.unemploymentRate * 100).toFixed(1)}%`}
          sub="structural baseline ~8%"
          color={unemColor}
          info={
            <InfoPanel title="Unemployment Rate">
              <p>The share of the labor force (48.7 million tracked workers) without employment in one of the 25 modeled occupations.</p>
              <ul>
                <li><strong>~8% is structural baseline</strong> — this represents frictional unemployment (workers between jobs) and people in sectors not tracked by this model. It exists even before any AI disruption.</li>
                <li><strong>Above 12%</strong> — displacement from AI automation is now measurably above normal churn.</li>
                <li><strong>Above 15%</strong> — serious structural unemployment. Safety nets are under strain.</li>
                <li><strong>Above 20%</strong> — crisis territory, comparable to the Great Depression peak.</li>
              </ul>
              <p><strong>What lowers it:</strong> Retraining programs (which place workers in new roles), labor protections (which slow layoffs), and regulation (which slows AI adoption). Lower AI capability or adoption speed directly reduces displacement.</p>
            </InfoPanel>
          }
        />
        <MetricCard
          label="Food Price Index"
          value={latest.foodPriceIndex.toFixed(3)}
          sub="baseline = 1.000"
          color={foodColor}
          info={
            <InfoPanel title="Food Price Index">
              <p>Relative cost of food compared to the starting year, where 1.000 = no change.</p>
              <ul>
                <li><strong>1.000</strong> — food costs the same as in 2025.</li>
                <li><strong>1.200</strong> — 20% more expensive. Noticeable but manageable.</li>
                <li><strong>1.500</strong> — 50% more expensive. Significant household budget pressure.</li>
                <li><strong>2.000+</strong> — food has doubled. Severe food insecurity risk, especially for lower-income households.</li>
              </ul>
              <p><strong>What drives it:</strong> When logistics workers (truck drivers, warehouse staff, freight movers) are displaced, fewer hands move food from farms to stores — causing delays, spoilage, and cost increases. Energy price shocks compound this.</p>
              <p><strong>What moderates it:</strong> High supply chain resilience, social transfer payments, and keeping energy costs low.</p>
            </InfoPanel>
          }
        />
        <MetricCard
          label="Inequality Index"
          value={latest.inequalityIndex.toFixed(2)}
          sub="baseline = 1.00"
          color={ineqColor}
          info={
            <InfoPanel title="Inequality Index">
              <p>Measures how concentrated income and wages have become, relative to the pre-AI baseline of 1.00.</p>
              <ul>
                <li><strong>1.00</strong> — same distribution as the starting year.</li>
                <li><strong>1.40</strong> — meaningfully more unequal. Two distinct labor markets forming.</li>
                <li><strong>1.80</strong> — sharply unequal. AI gains concentrated at the top; displaced workers falling further behind.</li>
                <li><strong>2.00+</strong> — severe. Associated with political instability and demand collapse.</li>
              </ul>
              <p><strong>What widens it:</strong> AI capability (boosts wages for high-skill workers while displacing low-skill), and corporate concentration (firms capture AI productivity gains rather than sharing them).</p>
              <p><strong>What compresses it:</strong> Social transfers directly reduce inequality by redistributing income to displaced workers.</p>
            </InfoPanel>
          }
        />
      </div>

      <StabilityMeter
        value={latest.stabilityIndex}
        unemploymentPenalty={unemploymentPenalty}
        foodPenalty={foodPenalty}
        inequalityPenalty={inequalityPenalty}
      />

      <Charts history={history} />

      <EventLog events={latest.eventLog} />
    </main>
  )
}
