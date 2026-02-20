import { useState, useCallback, useEffect, useRef } from "react"
import type { SliderInputs } from "./engine/types"
import { runSimulation } from "./engine/simulate"
import { ControlPanel } from "./components/ControlPanel"
import type { Mode } from "./components/ControlPanel"
import { Dashboard } from "./components/Dashboard"
import { Chatbot } from "./components/Chatbot"
import rawParams from "./data/modelParams.json"
import "./App.css"

const params = rawParams as any

const defaultSliders: SliderInputs = Object.fromEntries(
  Object.entries(params.sliders).map(([key, cfg]: [string, any]) => [key, cfg.default])
) as SliderInputs

const DEFAULT_HORIZON = 10

function AboutSection() {
  const [open, setOpen] = useState(false)
  return (
    <div className="about-section">
      <button className="about-toggle" onClick={() => setOpen(o => !o)}>
        {open ? "▲" : "▼"} About this simulation
      </button>
      {open && (
        <div className="about-body">
          <p><strong>AI Economy Lab</strong> is a simplified macroeconomic sandbox that models how AI adoption affects employment, wages, tech layoff waves, and social stability in the US tech sector over a configurable time horizon.</p>
          <h4>How it works</h4>
          <ul>
            <li><strong>22 tech occupations</strong> are tracked (~7.9M workers, representing the US tech sector jobs most exposed to AI disruption — out of ~160M total US workers). Wages are anchored to BLS May 2024 OEWS medians. Each role is scored on routine-ness, social complexity, analytical demand, and AI complementarity.</li>
            <li>Each year, jobs with high routine scores lose employment proportional to AI capability × adoption speed. Labor protections and retraining programs dampen this rate.</li>
            <li>High-complementarity roles (e.g. ML engineers, cloud architects, cybersecurity analysts) see wage growth as AI makes them more productive.</li>
            <li>The <strong>Tech Layoff Index</strong> rises when infrastructure roles (DevOps, DBAs, network admins) are displaced before AIOps is mature, creating reliability gaps — and falls when strong talent pipelines absorb shortfalls quickly.</li>
            <li>The <strong>Stability Index</strong> is a composite of unemployment, tech layoff pressure, and inequality penalties. Hover over it for the current breakdown.</li>
          </ul>
          <h4>Key sliders</h4>
          <ul>
            <li><strong>AI Capability</strong> — how powerful AI systems are (drives both displacement and wage gains)</li>
            <li><strong>Adoption Speed</strong> — how fast tech firms deploy AI (scale of disruption)</li>
            <li><strong>Regulation</strong> — government AI rules that slow adoption</li>
            <li><strong>Labor Protections</strong> — legal barriers to tech layoffs</li>
            <li><strong>Retraining Programs</strong> — cushions displacement by reducing job loss rate and raising the employment floor</li>
            <li><strong>Social Transfers</strong> — UBI-style payments that compress inequality and cushion the stability hit from layoff waves</li>
            <li><strong>Corporate Concentration</strong> — market power that suppresses wages and worsens inequality</li>
            <li><strong>Open Source AI Access</strong> — widely available open-source models accelerate displacement of mid-tier roles; restricted proprietary AI slows it but concentrates power</li>
            <li><strong>Talent Pipeline Strength</strong> — robustness of tech talent supply that dampens layoff spirals when infrastructure roles are displaced</li>
          </ul>
          <p className="about-disclaimer">This is a toy model for exploring economic intuitions — not a forecast. All wages are illustrative approximations based on BLS 2024 data.</p>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [sliders, setSliders] = useState<SliderInputs>(defaultSliders)
  const [horizon, setHorizon] = useState(DEFAULT_HORIZON)
  const [history, setHistory] = useState(() => runSimulation(defaultSliders, params, DEFAULT_HORIZON))
  const [viewIndex, setViewIndex] = useState(DEFAULT_HORIZON)
  const [playing, setPlaying] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [mode, setMode] = useState<Mode>(() =>
    (localStorage.getItem("appMode") as Mode | null) ?? "simple"
  )

  const handleModeToggle = useCallback(() => {
    setMode(prev => {
      const next: Mode = prev === "simple" ? "expert" : "simple"
      localStorage.setItem("appMode", next)
      return next
    })
  }, [])

  // Ref to always access latest viewIndex + history length inside interval
  const viewIndexRef = useRef(viewIndex)
  viewIndexRef.current = viewIndex
  const historyLenRef = useRef(history.length)
  historyLenRef.current = history.length

  // Play effect — advances viewIndex every 800ms while playing
  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => {
      const next = viewIndexRef.current + 1
      if (next >= historyLenRef.current) {
        setPlaying(false)
        setViewIndex(historyLenRef.current - 1)
      } else {
        setViewIndex(next)
      }
    }, 800)
    return () => clearInterval(id)
  }, [playing])

  const rerun = useCallback((newSliders: SliderInputs, years: number) => {
    const newHistory = runSimulation(newSliders, params, years)
    setHistory(newHistory)
    // Clamp viewIndex to new history length
    setViewIndex(prev => Math.min(prev, newHistory.length - 1))
  }, [])

  const handleSliderChange = useCallback((key: keyof SliderInputs, value: number) => {
    setSliders(prev => {
      const next = { ...prev, [key]: value }
      rerun(next, horizon)
      return next
    })
  }, [rerun, horizon])

  const handleReset = useCallback(() => {
    setSliders(defaultSliders)
    setHorizon(DEFAULT_HORIZON)
    setPlaying(false)
    const newHistory = runSimulation(defaultSliders, params, DEFAULT_HORIZON)
    setHistory(newHistory)
    setViewIndex(DEFAULT_HORIZON)
  }, [])

  const handleHorizonChange = useCallback((years: number) => {
    setHorizon(years)
    setPlaying(false)
    const newHistory = runSimulation(sliders, params, years)
    setHistory(newHistory)
    setViewIndex(newHistory.length - 1)
  }, [sliders])

  const handleScrub = useCallback((i: number) => {
    setPlaying(false)
    setViewIndex(i)
  }, [])

  const handlePlayPause = useCallback(() => {
    setPlaying(prev => {
      // If at the end and user hits play, restart from beginning
      if (!prev && viewIndexRef.current >= historyLenRef.current - 1) {
        setViewIndex(0)
      }
      return !prev
    })
  }, [])

  const handleJumpToEnd = useCallback(() => {
    setPlaying(false)
    setViewIndex(history.length - 1)
  }, [history.length])

  // Visible history is sliced to the current view index
  const visibleHistory = history.slice(0, viewIndex + 1)

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
        <ControlPanel
          sliders={sliders}
          params={params}
          onChange={handleSliderChange}
          mode={mode}
          onModeToggle={handleModeToggle}
        />
      </div>

      <div className="dashboard-wrapper" onClick={() => setPanelOpen(false)}>
        <Dashboard
          history={visibleHistory}
          currentYear={visibleHistory[visibleHistory.length - 1].year}
          viewIndex={viewIndex}
          totalYears={history.length - 1}
          playing={playing}
          currentHorizon={horizon}
          mode={mode}
          onScrub={handleScrub}
          onPlayPause={handlePlayPause}
          onJumpToEnd={handleJumpToEnd}
          onHorizonChange={handleHorizonChange}
        />
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
