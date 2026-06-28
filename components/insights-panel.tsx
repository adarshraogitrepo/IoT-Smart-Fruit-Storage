"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Lightbulb, AlertTriangle, CheckCircle2, Info } from "lucide-react"
import { type SensorReading, buildInsights } from "@/lib/analytics"

const TONE = {
  good: { icon: CheckCircle2, color: "var(--safe)" },
  info: { icon: Info, color: "var(--chart-1)" },
  warn: { icon: AlertTriangle, color: "var(--warn)" },
  danger: { icon: AlertTriangle, color: "var(--danger)" },
}

export function InsightsPanel({
  current,
  history,
}: {
  current: SensorReading
  history: SensorReading[]
}) {
  const insights = buildInsights(current, history)

  return (
    <div className="rounded-2xl border border-border glass p-5">
      <div className="flex items-center gap-2">
        <Lightbulb className="size-4 text-primary" />
        <h2 className="font-heading text-lg font-semibold">AI Insights</h2>
      </div>

      <div className="mt-4 space-y-2.5">
        <AnimatePresence mode="popLayout">
          {insights.map((ins) => {
            const t = TONE[ins.tone]
            const Icon = t.icon
            return (
              <motion.div
                key={ins.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-start gap-3 rounded-xl border border-border p-3"
                style={{ background: `color-mix(in oklch, ${t.color} 7%, transparent)` }}
              >
                <Icon className="mt-0.5 size-4 shrink-0" style={{ color: t.color }} />
                <p className="text-sm leading-relaxed text-foreground/90">{ins.message}</p>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
