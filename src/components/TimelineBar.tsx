const START_YEAR = 2025
const HORIZON_PRESETS = [
  { label: "2035", years: 10 },
  { label: "2045", years: 20 },
  { label: "2055", years: 30 },
  { label: "2075", years: 50 },
]

interface Props {
  viewIndex: number          // 0 = 2025, 1 = 2026, …
  totalYears: number         // history.length - 1  (max viewIndex)
  playing: boolean
  onScrub: (i: number) => void
  onPlayPause: () => void
  onJumpToEnd: () => void
  onHorizonChange: (years: number) => void
  currentHorizon: number
}

export function TimelineBar({
  viewIndex,
  totalYears,
  playing,
  onScrub,
  onPlayPause,
  onJumpToEnd,
  onHorizonChange,
  currentHorizon,
}: Props) {
  const currentYear = START_YEAR + viewIndex
  const endYear = START_YEAR + totalYears

  return (
    <div className="timeline-bar">
      {/* Row 1: scrubber + controls */}
      <div className="timeline-scrubber-row">
        <button
          className="timeline-btn timeline-playpause"
          onClick={onPlayPause}
          title={playing ? "Pause" : "Play"}
        >
          {playing ? "⏸" : "▶"}
        </button>

        <div className="timeline-scrubber-wrap">
          <input
            type="range"
            className="timeline-scrubber"
            min={0}
            max={totalYears}
            value={viewIndex}
            onChange={e => onScrub(Number(e.target.value))}
          />
          <div
            className="timeline-tick-labels"
            style={{ position: "relative" }}
          >
            <span className="timeline-tick-start">{START_YEAR}</span>
            <span className="timeline-tick-end">{endYear}</span>
          </div>
        </div>

        <div className="timeline-year-label">
          {currentYear}
        </div>

        <button
          className="timeline-btn timeline-end-btn"
          onClick={onJumpToEnd}
          title="Jump to end"
          disabled={viewIndex === totalYears}
        >
          ⏭
        </button>
      </div>

      {/* Row 2: horizon presets */}
      <div className="timeline-horizon-row">
        <span className="timeline-horizon-label">Simulate to:</span>
        {HORIZON_PRESETS.map(p => (
          <button
            key={p.label}
            className={`timeline-horizon-btn${currentHorizon === p.years ? " active" : ""}`}
            onClick={() => onHorizonChange(p.years)}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}
