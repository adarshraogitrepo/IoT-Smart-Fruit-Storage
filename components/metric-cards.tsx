"use client"

import { motion } from "framer-motion"
import { Thermometer, Droplets, Wind } from "lucide-react"
import { Area, AreaChart, ResponsiveContainer } from "recharts"
import {
  type SensorReading,
  type Status,
  statusFor,
  STATUS_COLOR,
} from "@/lib/analytics"
import { useThresholds } from "@/lib/thresholds-context"

type MetricKey = "temperature" | "humidity" | "mq135"

const CONFIG: Record<
  MetricKey,
  { label: string; unit: string; icon: typeof Thermometer; max: number }
> = {
  temperature: { label: "Temperature", unit: "°C", icon: Thermometer, max: 40 },
  humidity: { label: "Humidity", unit: "%", icon: Droplets, max: 100 },
  mq135: { label: "Air Quality (MQ135)", unit: "ppm", icon: Wind, max: 800 },
}

const STATUS_LABEL: Record<Status, string> = {
  safe: "Safe",
  warn: "Warning",
  danger: "Critical",
}

export function MetricCards({
  current,
  history,
}: {
  current: SensorReading
  history: SensorReading[]
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {(Object.keys(CONFIG) as MetricKey[]).map((key, i) => (
        <MetricCard key={key} metricKey={key} current={current} history={history} delay={i * 0.08} />
      ))}
    </div>
  )
}

function MetricCard({
  metricKey,
  current,
  history,
  delay,
}: {
  metricKey: MetricKey
  current: SensorReading
  history: SensorReading[]
  delay: number
}) {
  const { thresholds } = useThresholds()
  const cfg = CONFIG[metricKey]
  const Icon = cfg.icon
  const value = current[metricKey]
  const status = statusFor(metricKey, value, thresholds)
  const color = STATUS_COLOR[status]
  const spark = history.slice(-40).map((r, idx) => ({ idx, v: r[metricKey] }))
  const pct = Math.min(100, (value / cfg.max) * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="group relative overflow-hidden rounded-2xl border border-border glass p-5"
    >
      <div
        className="absolute -right-10 -top-10 size-32 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40"
        style={{ background: color }}
      />
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className="grid size-9 place-items-center rounded-xl"
            style={{ background: `color-mix(in oklch, ${color} 18%, transparent)`, color }}
          >
            <Icon className="size-4.5" />
          </span>
          <span className="text-sm font-medium text-muted-foreground">{cfg.label}</span>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider"
          style={{ background: `color-mix(in oklch, ${color} 16%, transparent)`, color }}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>

      <div className="mt-4 flex items-end gap-1.5">
        <span className="font-mono text-4xl font-bold tabular-nums tracking-tight">
          {metricKey === "mq135" ? Math.round(value) : value.toFixed(1)}
        </span>
        <span className="mb-1 text-sm text-muted-foreground">{cfg.unit}</span>
      </div>

      <div className="mt-3 h-12">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={spark} margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
            <defs>
              <linearGradient id={`grad-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.5} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke={color}
              strokeWidth={2}
              fill={`url(#grad-${metricKey})`}
              isAnimationActive={false}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
    </motion.div>
  )
}
