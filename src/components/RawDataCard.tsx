import { useState } from "react"
import type { SimulationState } from "../engine/types"
import { occupations as baseOccupations } from "../data/occupations"

interface Props {
  state: SimulationState
}

export function RawDataCard({ state }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="raw-data-card">
      <button className="raw-data-toggle" onClick={() => setOpen(o => !o)}>
        {open ? "▲" : "▼"} Raw Data — Year {state.year}
      </button>
      {open && (
        <div className="raw-data-body">
          {/* Index values */}
          <table className="raw-data-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>GDP Index</td><td>{state.gdpIndex.toFixed(4)}</td></tr>
              <tr><td>Unemployment Rate</td><td>{(state.unemploymentRate * 100).toFixed(4)}%</td></tr>
              <tr><td>Tech Layoff Index</td><td>{state.techLayoffIndex.toFixed(4)}</td></tr>
              <tr><td>Inequality Index</td><td>{state.inequalityIndex.toFixed(4)}</td></tr>
              <tr><td>Stability Index</td><td>{state.stabilityIndex.toFixed(4)}</td></tr>
              <tr><td>Total Employment</td><td>{state.totalEmployment.toLocaleString()}</td></tr>
            </tbody>
          </table>

          {/* Occupation breakdown */}
          <h4 className="raw-data-section-title">Occupation Detail</h4>
          <table className="raw-data-table">
            <thead>
              <tr>
                <th>Occupation</th>
                <th>Baseline</th>
                <th>Current</th>
                <th>Change</th>
                <th>Wage</th>
              </tr>
            </thead>
            <tbody>
              {state.occupations.map(o => {
                const base = baseOccupations.find(b => b.id === o.id)!
                const delta = o.employment - base.employment
                const pct = ((o.employment / base.employment - 1) * 100).toFixed(1)
                return (
                  <tr key={o.id}>
                    <td>{base.name}</td>
                    <td>{base.employment.toLocaleString()}</td>
                    <td>{Math.round(o.employment).toLocaleString()}</td>
                    <td style={{ color: delta < 0 ? "#ef4444" : "#22c55e" }}>
                      {delta >= 0 ? "+" : ""}{pct}%
                    </td>
                    <td>${Math.round(o.wage).toLocaleString()}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
