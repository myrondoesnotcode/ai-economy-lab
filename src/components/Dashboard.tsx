import type { SimulationState } from "../engine/types"
import { StabilityMeter } from "./StabilityMeter"
import { Charts } from "./Charts"
import { EventLog } from "./EventLog"
import { InfoPanel } from "./InfoPanel"
import { TimelineBar } from "./TimelineBar"
import { RawDataCard } from "./RawDataCard"
import type { Mode } from "./ControlPanel"

interface Props {
  history: SimulationState[]
  currentYear: number
  viewIndex: number
  totalYears: number
  playing: boolean
  currentHorizon: number
  mode: Mode
  theme: "dark" | "light"
  onScrub: (i: number) => void
  onPlayPause: () => void
  onJumpToEnd: () => void
  onHorizonChange: (years: number) => void
  onThemeToggle: () => void
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

export function Dashboard({
  history,
  currentYear,
  viewIndex,
  totalYears,
  playing,
  currentHorizon,
  mode,
  theme,
  onScrub,
  onPlayPause,
  onJumpToEnd,
  onHorizonChange,
  onThemeToggle,
}: Props) {
  const latest = history[history.length - 1]

  const unemColor = latest.unemploymentRate > 0.15 ? "#ef4444"
    : latest.unemploymentRate > 0.09 ? "#f97316" : "#22c55e"

  const techLayoffColor = latest.techLayoffIndex > 1.5 ? "#ef4444"
    : latest.techLayoffIndex > 1.2 ? "#f97316" : "#22c55e"

  const gdpColor = latest.gdpIndex < 80 ? "#ef4444"
    : latest.gdpIndex < 95 ? "#f97316" : "#22c55e"

  const ineqColor = latest.inequalityIndex > 2.0 ? "#ef4444"
    : latest.inequalityIndex > 1.4 ? "#f97316" : "#22c55e"

  const unemploymentPenalty = latest.unemploymentRate * 100 * 1.8
  const techLayoffPenalty = (latest.techLayoffIndex - 1) * 100 * 0.8
  const inequalityPenalty = (latest.inequalityIndex - 1.0) * 8.0

  return (
    <main className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">AI Economy Lab</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div className="dashboard-year">Year: <strong>{currentYear}</strong></div>
          <button className="theme-toggle" onClick={onThemeToggle} title="Toggle day/night mode">
            {theme === "dark" ? "☀ Day" : "🌙 Night"}
          </button>
        </div>
      </div>

      <TimelineBar
        viewIndex={viewIndex}
        totalYears={totalYears}
        playing={playing}
        currentHorizon={currentHorizon}
        onScrub={onScrub}
        onPlayPause={onPlayPause}
        onJumpToEnd={onJumpToEnd}
        onHorizonChange={onHorizonChange}
      />

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
              <p><strong>How it's calculated:</strong> Sum of (workers × wages) across all 22 occupations, divided by the year-one total. It rises when high-skill wages surge, even if many people are unemployed — so a high GDP doesn't necessarily mean widespread prosperity.</p>
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
              <p>The share of the labor force (~8.6 million tracked workers) without employment in one of the 22 modeled tech occupations.</p>
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
          label="Tech Layoff Index"
          value={latest.techLayoffIndex.toFixed(3)}
          sub="baseline = 1.000"
          color={techLayoffColor}
          info={
            <InfoPanel title="Tech Layoff Index">
              <p>Measures the intensity of tech sector layoff pressure relative to baseline, where 1.000 = normal churn.</p>
              <ul>
                <li><strong>1.000</strong> — normal tech sector turnover, comparable to pre-AI baseline.</li>
                <li><strong>1.200</strong> — 20% above baseline. Elevated layoffs but within historical norms for tech downturns.</li>
                <li><strong>1.500</strong> — 50% above baseline. Significant wave of displacement; hiring freezes and mass layoffs dominating headlines.</li>
                <li><strong>2.000+</strong> — structural breakdown. Comparable to the dot-com bust, but driven by automation rather than market correction.</li>
              </ul>
              <p><strong>What drives it:</strong> When infrastructure roles (DevOps, DBAs, network admins) are displaced before AIOps is mature, reliability gaps cascade into broader instability. Open-source AI access accelerates displacement of mid-tier roles.</p>
              <p><strong>What moderates it:</strong> Strong talent pipelines (bootcamps, retraining programs) absorb infrastructure gaps faster. Social transfers cushion displaced workers' impact on the broader economy.</p>
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
        techLayoffPenalty={techLayoffPenalty}
        inequalityPenalty={inequalityPenalty}
      />

      <Charts history={history} />

      {mode === "expert" && <RawDataCard state={latest} />}

      <EventLog events={latest.eventLog} />
    </main>
  )
}
