import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend
} from "recharts"
import type { SimulationState } from "../engine/types"
import { occupations as baseOccupations } from "../data/occupations"

interface Props {
  history: SimulationState[]
}

const COLORS = {
  gdp: "#6366f1",
  food: "#f97316",
  stability: "#22c55e",
}

export function Charts({ history }: Props) {
  const latest = history[history.length - 1]

  // Employment bar chart data
  const employmentData = latest.occupations.map(o => {
    const base = baseOccupations.find(b => b.id === o.id)!
    return {
      name: base.name.length > 22 ? base.name.slice(0, 22) + "…" : base.name,
      employment: Math.round(o.employment / 1_000_000 * 10) / 10,
      baseline: Math.round(base.employment / 1_000_000 * 10) / 10,
    }
  }).sort((a, b) => b.employment - a.employment)

  // Time series data
  const timeData = history.map(s => ({
    year: s.year,
    gdp: Math.round(s.gdpIndex * 10) / 10,
    food: Math.round(s.foodPriceIndex * 100) / 100,
    stability: Math.round(s.stabilityIndex * 10) / 10,
  }))

  return (
    <div className="charts">
      {/* Employment bar chart */}
      <div className="chart-card">
        <h3 className="chart-title">Employment by Occupation (millions)</h3>
        <ResponsiveContainer width="100%" height={Math.max(400, employmentData.length * 22)}>
          <BarChart data={employmentData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
            <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} />
            <YAxis
              type="category"
              dataKey="name"
              width={165}
              tick={{ fontSize: 10, fill: "#d1d5db" }}
            />
            <Tooltip
              contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 6 }}
              labelStyle={{ color: "#f9fafb" }}
              itemStyle={{ color: "#d1d5db" }}
              formatter={(v, name) => [`${v ?? 0}M`, name]}
            />
            <Bar dataKey="baseline" fill="#374151" name="Baseline" radius={[0, 2, 2, 0]} />
            <Bar dataKey="employment" fill="#6366f1" name="Current" radius={[0, 2, 2, 0]} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#9ca3af" }} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* GDP line chart */}
      <div className="chart-card">
        <h3 className="chart-title">GDP Index over Time (baseline = 100)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={timeData} margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#9ca3af" }} />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} domain={["auto", "auto"]} />
            <Tooltip
              contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 6 }}
              labelStyle={{ color: "#f9fafb" }}
              itemStyle={{ color: COLORS.gdp }}
            />
            <Line
              type="monotone"
              dataKey="gdp"
              stroke={COLORS.gdp}
              strokeWidth={2}
              dot={false}
              name="GDP Index"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Food price line chart */}
      <div className="chart-card">
        <h3 className="chart-title">Food Price Index over Time (baseline = 1.0)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={timeData} margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#9ca3af" }} />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} domain={["auto", "auto"]} />
            <Tooltip
              contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 6 }}
              labelStyle={{ color: "#f9fafb" }}
              itemStyle={{ color: COLORS.food }}
            />
            <Line
              type="monotone"
              dataKey="food"
              stroke={COLORS.food}
              strokeWidth={2}
              dot={false}
              name="Food Price Index"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stability line chart */}
      <div className="chart-card">
        <h3 className="chart-title">Stability Index over Time (max = 100)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={timeData} margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#9ca3af" }} />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} domain={[0, 100]} />
            <Tooltip
              contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 6 }}
              labelStyle={{ color: "#f9fafb" }}
              itemStyle={{ color: COLORS.stability }}
            />
            <Line
              type="monotone"
              dataKey="stability"
              stroke={COLORS.stability}
              strokeWidth={2}
              dot={false}
              name="Stability Index"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
