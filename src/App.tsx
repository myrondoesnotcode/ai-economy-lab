import { useState, useCallback } from "react"
import type { SliderInputs } from "./engine/types"
import { runSimulation } from "./engine/simulate"
import { ControlPanel } from "./components/ControlPanel"
import { Dashboard } from "./components/Dashboard"
import { Chatbot } from "./components/Chatbot"
import rawParams from "./data/modelParams.json"
import "./App.css"

const params = rawParams as any

const defaultSliders: SliderInputs = Object.fromEntries(
  Object.entries(params.sliders).map(([key, cfg]: [string, any]) => [key, cfg.default])
) as SliderInputs

function AboutSection() {
  const [open, setOpen] = useState(false)
  return (
    <div className="about-section">
      <button className="about-toggle" onClick={() => setOpen(o => !o)}>
        {open ? "▲" : "▼"} About this simulation
      </button>
      {open && (
        <div className="about-body">
          <p><strong>AI Economy Lab</strong> is a simplified macroeconomic sandbox that models how AI adoption affects employment, wages, food prices, and social stability over a 10-year horizon.</p>
          <h4>How it works</h4>
          <ul>
            <li><strong>25 occupations</strong> are tracked (~45M workers, selected to represent the jobs most exposed to AI disruption — out of ~160M total US workers), each scored on routine-ness, social complexity, analytical demand, and AI complementarity.</li>
            <li>Each year, jobs with high routine scores lose employment proportional to AI capability × adoption speed. Labor protections and retraining programs dampen this rate.</li>
            <li>High-complementarity roles (e.g. ML engineers, nurses) see wage growth as AI makes them more productive.</li>
            <li>Food prices rise when logistics jobs decline and energy costs increase; social transfers can dampen this.</li>
            <li>The <strong>Stability Index</strong> is a composite of unemployment, food inflation, and inequality penalties. Hover over it for the current breakdown.</li>
          </ul>
          <h4>Key sliders</h4>
          <ul>
            <li><strong>AI Capability</strong> — how powerful AI systems are (drives both displacement and wage gains)</li>
            <li><strong>Adoption Speed</strong> — how fast firms deploy AI (scale of disruption)</li>
            <li><strong>Regulation</strong> — government AI rules that slow adoption</li>
            <li><strong>Labor Protections</strong> — legal barriers to layoffs</li>
            <li><strong>Retraining Programs</strong> — cushions displacement by reducing job loss rate</li>
            <li><strong>Social Transfers</strong> — UBI-style payments that compress inequality and dampen food price spikes</li>
            <li><strong>Corporate Concentration</strong> — market power that suppresses wages and worsens inequality</li>
          </ul>
          <p className="about-disclaimer">This is a toy model for exploring economic intuitions — not a forecast. All parameters are illustrative.</p>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [sliders, setSliders] = useState<SliderInputs>(defaultSliders)
  const [history, setHistory] = useState(() => runSimulation(defaultSliders, params, 10))
  const [panelOpen, setPanelOpen] = useState(false)

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
      {/* Mobile controls toggle */}
      <button
        className="mobile-panel-toggle"
        onClick={() => setPanelOpen(o => !o)}
        aria-label="Toggle controls"
      >
        ⚙ Controls
      </button>

      <div className={`control-panel-wrapper${panelOpen ? " panel-open" : ""}`}>
        <ControlPanel sliders={sliders} params={params} onChange={handleSliderChange} />
      </div>

      <div className="dashboard-wrapper" onClick={() => setPanelOpen(false)}>
        <Dashboard history={history} currentYear={latest.year} />
        <div className="bottom-actions">
          <button className="reset-btn" onClick={handleReset}>↺ Reset to Defaults</button>
        </div>
        <Chatbot
          history={history}
          sliders={sliders}
          onSliderChange={handleSliderChange}
          params={params}
        />
        <AboutSection />
      </div>
    </div>
  )
}
