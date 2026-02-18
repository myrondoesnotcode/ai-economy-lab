import { useState, useCallback } from "react"
import type { SliderInputs } from "./engine/types"
import { runSimulation } from "./engine/simulate"
import { ControlPanel } from "./components/ControlPanel"
import { Dashboard } from "./components/Dashboard"
import rawParams from "./data/modelParams.json"
import "./App.css"

const params = rawParams as any

const defaultSliders: SliderInputs = Object.fromEntries(
  Object.entries(params.sliders).map(([key, cfg]: [string, any]) => [key, cfg.default])
) as SliderInputs

export default function App() {
  const [sliders, setSliders] = useState<SliderInputs>(defaultSliders)
  const [history, setHistory] = useState(() => runSimulation(defaultSliders, params, 10))

  const rerun = useCallback((newSliders: SliderInputs) => {
    setHistory(runSimulation(newSliders, params, 10))
  }, [])

  const handleSliderChange = useCallback((key: keyof SliderInputs, value: number) => {
    setSliders(prev => {
      const next = { ...prev, [key]: value }
      rerun(next)
      return next
    })
  }, [rerun])

  const handleReset = useCallback(() => {
    setSliders(defaultSliders)
    rerun(defaultSliders)
  }, [rerun])

  const latest = history[history.length - 1]

  return (
    <div className="app-layout">
      <ControlPanel sliders={sliders} params={params} onChange={handleSliderChange} />
      <div className="dashboard-wrapper">
        <Dashboard history={history} currentYear={latest.year} />
        <button className="reset-btn" onClick={handleReset}>Reset to Defaults</button>
      </div>
    </div>
  )
}
