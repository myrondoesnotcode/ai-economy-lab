interface Props {
  value: number
  tooltip?: string
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

export function StabilityMeter({ value, tooltip }: Props) {
  const color = getColor(value)
  const label = getLabel(value)
  const pct = Math.max(0, Math.min(100, value))

  return (
    <div className="stability-meter" title={tooltip}>
      <div className="stability-header">
        <span className="stability-title">
          Stability Index
          <span className="stability-info-hint">ⓘ</span>
        </span>
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
      </div>
    </div>
  )
}
