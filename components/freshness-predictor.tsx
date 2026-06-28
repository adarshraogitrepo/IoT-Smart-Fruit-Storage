"use client"

import { motion } from "framer-motion"
import { Sparkles, Clock, TrendingDown } from "lucide-react"
import { type SensorReading, predictFreshness, type RipenessStage } from "@/lib/analytics"

const STAGE_META: Record<RipenessStage, { color: string; desc: string }> = {
  Fresh: { color: "var(--safe)", desc: "Optimal condition, minimal ripening activity." },
  "Moderately Ripe": { color: "var(--chart-2)", desc: "Normal ripening underway." },
  "Highly Ripe": { color: "var(--warn)", desc: "Accelerated ripening — monitor closely." },
  "Spoilage Risk": { color: "var(--danger)", desc: "High spoilage probability detected." },
}

const STAGES: RipenessStage[] = ["Fresh", "Moderately Ripe", "Highly Ripe", "Spoilage Risk"]

export function FreshnessPredictor({ current }: { current: SensorReading }) {
  const p = predictFreshness(current)
  const meta = STAGE_META[p.stage]
  const activeIdx = STAGES.indexOf(p.stage)

  return (
    <div className="rounded-2xl border border-border glass p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <h2 className="font-heading text-lg font-semibold">AI Freshness Predictor</h2>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl border border-border p-4"
          style={{ background: `color-mix(in oklch, ${meta.color} 10%, transparent)` }}
        >
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Ripeness Stage</span>
          <div className="mt-1 text-2xl font-bold" style={{ color: meta.color }}>
            {p.stage}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{meta.desc}</p>
        </motion.div>

        <div className="rounded-xl border border-border p-4">
          <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
            <Clock className="size-3.5" /> Predicted Remaining Shelf Life
          </span>
          <div className="mt-1 flex items-end gap-1.5">
            <span className="font-mono text-3xl font-bold tabular-nums">{p.shelfLifeDays}</span>
            <span className="mb-1 text-sm text-muted-foreground">Days</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingDown className="size-3.5" /> Spoilage probability {p.spoilageProbability}%
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex h-2 overflow-hidden rounded-full">
          {STAGES.map((s, i) => (
            <div
              key={s}
              className="flex-1 transition-opacity"
              style={{
                background: STAGE_META[s].color,
                opacity: i === activeIdx ? 1 : 0.25,
              }}
            />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-[0.65rem] text-muted-foreground">
          {STAGES.map((s) => (
            <span key={s} className="text-center">{s.split(" ")[0]}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
