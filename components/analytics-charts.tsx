"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { LineChartIcon } from "lucide-react"
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { type SensorReading, formatTime } from "@/lib/analytics"

const RANGES = [
  { key: "1h", label: "1 Hour", ms: 60 * 60 * 1000 },
  { key: "6h", label: "6 Hours", ms: 6 * 60 * 60 * 1000 },
  { key: "24h", label: "24 Hours", ms: 24 * 60 * 60 * 1000 },
  { key: "7d", label: "7 Days", ms: 7 * 24 * 60 * 60 * 1000 },
  { key: "30d", label: "30 Days", ms: 30 * 24 * 60 * 60 * 1000 },
] as const

type Metric = "temperature" | "humidity" | "mq135" | "all"

const SERIES = [
  { key: "temperature", label: "Temp", color: "var(--chart-1)" },
  { key: "humidity", label: "Humidity", color: "var(--chart-2)" },
  { key: "mq135", label: "MQ135", color: "var(--chart-3)" },
] as const

export function AnalyticsCharts({ history }: { history: SensorReading[] }) {
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("1h")
  const [metric, setMetric] = useState<Metric>("all")

  const data = useMemo(() => {
    const span = RANGES.find((r) => r.key === range)!.ms
    const cutoff = Date.now() - span
    const filtered = history.filter((r) => r.timestamp >= cutoff)
    const rows = filtered.length > 1 ? filtered : history.slice(-30)
    return rows.map((r) => ({
      t: formatTime(r.timestamp),
      temperature: r.temperature,
      humidity: r.humidity,
      mq135: r.mq135,
    }))
  }, [history, range])

  const visible = metric === "all" ? SERIES : SERIES.filter((s) => s.key === metric)

  return (
    <div className="rounded-2xl border border-border glass p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <LineChartIcon className="size-4 text-primary" />
          <h2 className="font-heading text-lg font-semibold">Combined Analytics</h2>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {([["all", "All"], ...SERIES.map((s) => [s.key, s.label])] as [Metric, string][]).map(
            ([key, label]) => (
              <button
                key={key}
                onClick={() => setMetric(key)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  metric === key
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ),
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`rounded-md px-2.5 py-1 font-mono text-[0.7rem] uppercase tracking-wider transition-colors ${
              range === r.key
                ? "border border-primary/50 bg-primary/15 text-primary"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <motion.div
        key={`${range}-${metric}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="mt-4 h-[340px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
            <defs>
              {visible.map((s) => (
                <linearGradient key={s.key} id={`area-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="t"
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              minTickGap={32}
            />
            <YAxis
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                color: "var(--popover-foreground)",
                fontSize: 12,
              }}
            />
            {visible.map((s) => (
              <Area
                key={`a-${s.key}`}
                type="monotone"
                dataKey={s.key}
                stroke="none"
                fill={`url(#area-${s.key})`}
                isAnimationActive={false}
              />
            ))}
            {visible.map((s) => (
              <Line
                key={`l-${s.key}`}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                isAnimationActive
                animationDuration={600}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  )
}
