import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend
} from "recharts"
import type { SimulationState } from "../engine/types"
import { occupations as baseOccupations } from "../data/occupations"
import { InfoPanel } from "./InfoPanel"

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

  // Employment bar chart data — keep full name for tooltip, truncated for axis
  const employmentData = latest.occupations.map(o => {
    const base = baseOccupations.find(b => b.id === o.id)!
    return {
      name: base.name.length > 28 ? base.name.slice(0, 28) + "…" : base.name,
      fullName: base.name,
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

  // Custom tooltip for bar chart — shows full occupation name
  const BarTooltip = ({ active, payload, label }: {
    active?: boolean
    payload?: { name: string; value: number; fill: string }[]
    label?: string
  }) => {
    if (!active || !payload?.length) return null
    const entry = employmentData.find(d => d.name === label)
    const displayName = entry?.fullName ?? label ?? ""
    return (
      <div style={{
        background: "#1f2937",
        border: "1px solid #374151",
        borderRadius: 6,
        padding: "8px 12px",
        fontSize: 12,
      }}>
        <p style={{ color: "#f9fafb", marginBottom: 6, fontWeight: 600 }}>{displayName}</p>
        {payload.map(p => (
          <p key={p.name} style={{ color: "#d1d5db", margin: "2px 0" }}>
            {p.name}: <span style={{ color: p.fill, fontWeight: 600 }}>{p.value ?? 0}M</span>
          </p>
        ))}
      </div>
    )
  }

  return (
    <div className="charts">
      {/* Employment bar chart */}
      <div className="chart-card">
        <div className="chart-card-header">
          <h3 className="chart-title">Employment by Occupation — 25 tracked roles (millions)</h3>
          <InfoPanel title="Employment by Occupation">
            <p>This chart shows the 25 occupations tracked by this simulation — together about <strong>45 million workers</strong>, selected to represent the jobs most exposed to AI disruption. The full US labor force is ~160 million; the remaining ~115 million are not modeled here.</p>
            <ul>
              <li><strong>Grey bars (Baseline)</strong> — how many workers were in each job before AI disruption. This is fixed and doesn't change.</li>
              <li><strong>Purple bars (Current)</strong> — how many workers are still employed in that job right now, after automation has had its effect.</li>
              <li><strong>A shrinking purple bar</strong> means AI has displaced workers from that role. The further it falls short of the grey bar, the worse the displacement.</li>
              <li><strong>Numbers on the X-axis</strong> are millions of workers — so "4" means 4 million people.</li>
            </ul>
            <p>Jobs with high <em>routine scores</em> (cashiers, data entry, office clerks) shrink fastest. Jobs with high <em>social or complementarity scores</em> (nurses, managers, ML engineers) are more protected or even grow in value.</p>
          </InfoPanel>
        </div>
        <ResponsiveContainer width="100%" height={Math.max(400, employmentData.length * 22)}>
          <BarChart data={employmentData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 24 }}>
            <XAxis
              type="number"
              domain={[0, 5]}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              label={{ value: "workers (millions)", position: "insideBottomRight", offset: -4, fontSize: 10, fill: "#6b7280" }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={210}
              tick={{ fontSize: 10, fill: "#d1d5db" }}
            />
            <Tooltip content={<BarTooltip />} />
            <Bar dataKey="baseline" fill="#374151" name="Baseline" radius={[0, 2, 2, 0]} />
            <Bar dataKey="employment" fill="#6366f1" name="Current" radius={[0, 2, 2, 0]} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#9ca3af" }} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* GDP line chart */}
      <div className="chart-card">
        <div className="chart-card-header">
          <h3 className="chart-title">GDP Index over Time (baseline = 100)</h3>
          <InfoPanel title="GDP Index">
            <p>This tracks total economic output over the 10-year simulation, expressed as an index where the starting year = 100.</p>
            <ul>
              <li><strong>Above 100</strong> — the economy is producing more than it did at the start. AI is boosting productivity enough to offset displacement.</li>
              <li><strong>Below 100</strong> — output has fallen. Mass unemployment is destroying spending power faster than AI productivity gains can compensate.</li>
              <li><strong>How it's calculated:</strong> GDP is approximated as the sum of (workers × average wage) across all 25 occupations, normalized to the starting year.</li>
            </ul>
            <p><strong>Important caveat:</strong> GDP rising doesn't mean everyone is doing better. If high-skill wages soar while millions lose their jobs, GDP can look healthy while median household income collapses. Watch this chart alongside the Inequality and Unemployment metrics.</p>
          </InfoPanel>
        </div>
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
        <div className="chart-card-header">
          <h3 className="chart-title">Food Price Index over Time (baseline = 1.0)</h3>
          <InfoPanel title="Food Price Index">
            <p>This tracks how expensive food has become relative to the starting year, where 1.0 = baseline prices.</p>
            <ul>
              <li><strong>1.0</strong> — food costs the same as at the start of the simulation.</li>
              <li><strong>1.5</strong> — food is 50% more expensive than baseline.</li>
              <li><strong>2.0</strong> — food has doubled in price.</li>
            </ul>
            <p><strong>What drives it up:</strong></p>
            <ul>
              <li><strong>Logistics job losses</strong> — fewer truck drivers, warehouse workers, and freight movers means slower delivery, more spoilage, and higher costs passed to consumers.</li>
              <li><strong>Energy cost shocks</strong> — higher fuel prices increase transportation and refrigeration costs throughout the food supply chain.</li>
            </ul>
            <p><strong>What keeps it down:</strong> High supply chain resilience (alternative logistics routes, automation in warehousing) and social transfers (which support food purchasing power) both dampen price increases.</p>
            <p>Food inflation hits low-income households hardest — they spend a larger fraction of their income on food than wealthier households do.</p>
          </InfoPanel>
        </div>
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
        <div className="chart-card-header">
          <h3 className="chart-title">Stability Index over Time (max = 100)</h3>
          <InfoPanel title="Stability Index over Time">
            <p>This chart shows how social and economic stability evolves across the 10-year simulation. It starts at 100 and falls as conditions worsen.</p>
            <p><strong>How it's calculated:</strong></p>
            <ul>
              <li>Stability = 100 − (unemployment penalty) − (food price penalty) − (inequality penalty)</li>
              <li>Unemployment has the largest weight — mass joblessness is the most destabilizing factor in the model.</li>
            </ul>
            <p><strong>Thresholds to watch:</strong></p>
            <ul>
              <li><strong>70–100 (Stable)</strong> — manageable disruption, society adapting.</li>
              <li><strong>45–70 (Strained)</strong> — visible stress: rising populism, strained safety nets, growing inequality.</li>
              <li><strong>25–45 (Unstable)</strong> — social cohesion breaking down. Historical analogues: Rust Belt deindustrialization, Great Depression-era instability.</li>
              <li><strong>Below 25 (Critical)</strong> — systemic breakdown risk.</li>
            </ul>
            <p>A rapid drop is more alarming than a gradual one — it suggests the economy crossed a tipping point rather than adjusting slowly.</p>
          </InfoPanel>
        </div>
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
