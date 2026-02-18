import type { SliderInputs, ModelParams } from "../engine/types"

interface Props {
  sliders: SliderInputs
  params: ModelParams
  onChange: (key: keyof SliderInputs, value: number) => void
}

export function ControlPanel({ sliders, params, onChange }: Props) {
  const sliderKeys = Object.keys(params.sliders) as (keyof SliderInputs)[]

  return (
    <aside className="control-panel">
      <h2 className="panel-title">Controls</h2>
      <p className="panel-subtitle">Adjust sliders — simulation updates instantly</p>
      <div className="slider-list">
        {sliderKeys.map(key => {
          const cfg = params.sliders[key]
          const value = sliders[key]
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
        })}
      </div>
    </aside>
  )
}
