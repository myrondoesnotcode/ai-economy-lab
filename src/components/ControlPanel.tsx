import type { SliderInputs, ModelParams } from "../engine/types"
import { PRESETS, matchingPreset } from "../data/presets"

export type Mode = "simple" | "expert"

interface Props {
  sliders: SliderInputs
  params: ModelParams
  onChange: (key: keyof SliderInputs, value: number) => void
  mode: Mode
  onModeToggle: () => void
}

// Maps a continuous value to the nearest of 5 step indices (0–4)
function valueToStepIndex(value: number, min: number, max: number): number {
  const pct = (value - min) / (max - min)
  return Math.round(pct * 4)
}

// Maps a step index (0–4) to a continuous value
function stepIndexToValue(index: number, min: number, max: number): number {
  return min + (index / 4) * (max - min)
}

export function ControlPanel({ sliders, params, onChange, mode, onModeToggle }: Props) {
  const sliderKeys = Object.keys(params.sliders) as (keyof SliderInputs)[]
  const activePreset = matchingPreset(sliders)

  function applyPreset(preset: typeof PRESETS[0]) {
    ;(Object.keys(preset.sliders) as (keyof SliderInputs)[]).forEach(key => {
      onChange(key, preset.sliders[key])
    })
  }

  return (
    <aside className="control-panel">
      {/* Header with mode toggle */}
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Controls</h2>
          <p className="panel-subtitle">
            {mode === "simple"
              ? "Pick a scenario or adjust the sliders"
              : "Adjust sliders — simulation updates instantly"}
          </p>
        </div>
        <button className="mode-toggle" onClick={onModeToggle} title="Switch mode">
          {mode === "simple" ? "Expert" : "Simple"}
        </button>
      </div>

      {/* Preset scenarios — simple mode only */}
      {mode === "simple" && (
        <div className="preset-section">
          <div className="preset-grid">
            {PRESETS.map(preset => (
              <button
                key={preset.label}
                className={`preset-btn${activePreset?.label === preset.label ? " active" : ""}`}
                onClick={() => applyPreset(preset)}
              >
                <span className="preset-icon">{preset.icon}</span>
                <span className="preset-name">{preset.label}</span>
                <span className="preset-desc">{preset.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Slider list */}
      <div className="slider-list">
        {sliderKeys.map(key => {
          const cfg = params.sliders[key]
          const value = sliders[key]

          if (mode === "expert") {
            // ── Expert mode: original numeric slider ──────────────────────
            return (
              <div key={key} className="slider-item">
                <div className="slider-header">
                  <label className="slider-label">{cfg.label}</label>
                  <span className="slider-value">{value.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={cfg.min}
                  max={cfg.max}
                  step={cfg.step}
                  value={value}
                  onChange={e => onChange(key, parseFloat(e.target.value))}
                  className="slider-input"
                />
                <div className="slider-bounds">
                  <span>{cfg.min}</span>
                  <span>{cfg.max}</span>
                </div>
                <p className="slider-tooltip">{cfg.tooltip}</p>
              </div>
            )
          }

          // ── Simple mode: 5-step labeled slider ────────────────────────
          const steps: string[] = cfg.simpleSteps ?? ["None", "Low", "Medium", "High", "Maximum"]
          const stepIndex = valueToStepIndex(value, cfg.min, cfg.max)
          const currentStepLabel = steps[stepIndex] ?? steps[2]

          return (
            <div key={key} className="slider-item slider-item-simple">
              <div className="slider-header">
                <label className="slider-label">{cfg.simpleLabel ?? cfg.label}</label>
                <span className="slider-value slider-value-step">{currentStepLabel}</span>
              </div>
              <input
                type="range"
                min={0}
                max={4}
                step={1}
                value={stepIndex}
                onChange={e => {
                  const idx = parseInt(e.target.value)
                  onChange(key, stepIndexToValue(idx, cfg.min, cfg.max))
                }}
                className="slider-input"
              />
              <div className="simple-step-labels">
                <span>{steps[0]}</span>
                <span>{steps[4]}</span>
              </div>
              <p className="slider-tooltip">{cfg.simpleTooltip ?? cfg.tooltip}</p>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
