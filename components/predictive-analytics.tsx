"use client"

import { useMemo } from "react"
import { Brain } from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { type SensorReading, forecast, THRESHOLDS } from "@/lib/analytics"

const HORIZONS = [
  { label: "1 Hour", steps: 20 },
  { label: "6 Hours", steps: 60 },
  { label: "24 Hours", steps: 96 },
]

export function PredictiveAnalytics({ history }: { history: SensorReading[] }) {
  const { chart, predictions } = useMemo(() => {
    const temps = history.map((r) => r.temperature)
    const recent = history.slice(-24)
    const projForChart = forecast(temps, 24)
    const chart = [
      ...recent.map((r, i) => ({ i, actual: r.temperature, predicted: null as number | null })),
      ...projForChart.map((v, i) => ({
        i: recent.length + i,
        actual: null as number | null,
        predicted: Math.round(v * 10) / 10,
      })),
    ]
    const predictions = HORIZONS.map((h) => {
      const proj = forecast(temps, h.steps)
      const val = proj[proj.length - 1] ?? temps[temps.length - 1] ?? 0
      return { ...h, value: Math.round(val * 10) / 10 }
    })
    return { chart, predictions }
  }, [history])

  return (
    <div className="rounded-2xl border border-border glass p-5">
      <div className="flex items-center gap-2">
        <Brain className="size-4 text-primary" />
        <h2 className="font-heading text-lg font-semibold">Predictive Analytics</h2>
        <span className="ml-auto text-xs text-muted-foreground">Temperature forecast</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {predictions.map((p) => (
          <div key={p.label} className="rounded-xl border border-border p-3 text-center">
            <div className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">{p.label}</div>
            <div className="mt-1 font-mono text-xl font-bold tabular-nums">{p.value}°C</div>
          </div>
        ))}
      </div>

      <div className="mt-4 h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chart} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="pred-actual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="pred-future" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-5)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--chart-5)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="i" hide />
            <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                fontSize: 12,
              }}
            />
            <ReferenceLine
              y={THRESHOLDS.temperature.critical}
              stroke="var(--danger)"
              strokeDasharray="4 4"
              label={{ value: "Critical", fill: "var(--danger)", fontSize: 10, position: "insideTopRight" }}
            />
            <Area type="monotone" dataKey="actual" stroke="var(--chart-1)" strokeWidth={2} fill="url(#pred-actual)" isAnimationActive={false} />
            <Area type="monotone" dataKey="predicted" stroke="var(--chart-5)" strokeWidth={2} strokeDasharray="5 4" fill="url(#pred-future)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
