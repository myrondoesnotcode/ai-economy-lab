import { InfoPanel } from "./InfoPanel"

interface Props {
  value: number
  tooltip?: string
  unemploymentPenalty: number
  techLayoffPenalty: number
  inequalityPenalty: number
}

function getColor(value: number): string {
  if (value >= 70) return "#22c55e"
  if (value >= 45) return "#eab308"
  if (value >= 25) return "#f97316"
  return "#ef4444"
}

function getLabel(value: number): string {
  if (value >= 70) return "Stable"
  if (value >= 45) return "Strained"
  if (value >= 25) return "Unstable"
  return "Critical"
}

export function StabilityMeter({ value, unemploymentPenalty, techLayoffPenalty, inequalityPenalty }: Props) {
  const color = getColor(value)
  const label = getLabel(value)
  const pct = Math.max(0, Math.min(100, value))
  const total = unemploymentPenalty + techLayoffPenalty + inequalityPenalty

  return (
    <div className="stability-meter">
      <div className="stability-header">
        <span className="stability-title">Stability Index</span>
        <span className="stability-badge" style={{ background: color }}>
          {label}
        </span>
      </div>
      <div className="stability-bar-track">
        <div
          className="stability-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="stability-value" style={{ color }}>
        {value.toFixed(1)} / 100
        <span className="stability-breakdown">
          &nbsp;·&nbsp; −{unemploymentPenalty.toFixed(1)} unem &nbsp;·&nbsp; −{techLayoffPenalty.toFixed(1)} layoff &nbsp;·&nbsp; −{inequalityPenalty.toFixed(1)} ineq
        </span>
      </div>
      <InfoPanel title="Stability Index">
        <p>
          A composite score from <strong>0–100</strong> measuring how close the economy is to social breakdown.
          It starts at 100 and gets dragged down by three forces: unemployment, food price inflation, and inequality.
          It <em>cannot</em> go above 100.
        </p>
        <p><strong>The formula:</strong></p>
        <p style={{ fontFamily: "monospace", fontSize: "0.76rem", background: "rgba(0,0,0,0.3)", padding: "8px 10px", borderRadius: 5 }}>
          Stability = 100 − (unemployment × 1.8) − (tech layoff index × 0.8) − (inequality gap × 8.0)
        </p>
        <p><strong>Right now, the score of {value.toFixed(1)} breaks down as:</strong></p>
        <ul>
          <li>Starting from 100</li>
          <li>Unemployment is dragging it down by <strong style={{ color: "#ef4444" }}>−{unemploymentPenalty.toFixed(1)}</strong> points</li>
          <li>Tech layoff pressure is dragging it down by <strong style={{ color: "#f97316" }}>−{techLayoffPenalty.toFixed(1)}</strong> points</li>
          <li>Inequality is dragging it down by <strong style={{ color: "#eab308" }}>−{inequalityPenalty.toFixed(1)}</strong> points</li>
          <li>Total drag: <strong>−{total.toFixed(1)}</strong> → score = <strong style={{ color }}>{value.toFixed(1)}</strong></li>
        </ul>
        <p><strong>What the labels mean:</strong></p>
        <ul>
          <li><strong style={{ color: "#22c55e" }}>Stable (70–100)</strong> — the tech sector is absorbing disruption. Workers are retraining, layoff waves are manageable, inequality hasn't exploded.</li>
          <li><strong style={{ color: "#eab308" }}>Strained (45–70)</strong> — visible stress. Layoff waves are rising, safety nets are under pressure, political trust in the tech industry is fraying.</li>
          <li><strong style={{ color: "#f97316" }}>Unstable (25–45)</strong> — serious breakdown risk. Comparable to the dot-com bust or post-2008 tech contraction, but structural.</li>
          <li><strong style={{ color: "#ef4444" }}>Critical (0–25)</strong> — systemic crisis in the tech labor market. Mass displacement without recovery pathways.</li>
        </ul>
        <p>
          Unemployment has the biggest weight (1.8×) because joblessness is self-reinforcing — displaced tech workers spend less, which contracts the broader economy.
          Inequality gets a high weight (8.0×) because even small increases in concentration rapidly erode social cohesion and political trust.
        </p>
      </InfoPanel>
    </div>
  )
}
