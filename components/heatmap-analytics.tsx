"use client"

import { useMemo } from "react"
import { Grid3x3 } from "lucide-react"
import { type SensorReading, predictFreshness } from "@/lib/analytics"

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function riskColor(v: number) {
  // v is 0..1 spoilage risk
  if (v < 0.25) return "var(--safe)"
  if (v < 0.5) return "var(--chart-2)"
  if (v < 0.75) return "var(--warn)"
  return "var(--danger)"
}

export function HeatmapAnalytics({ history }: { history: SensorReading[] }) {
  const hourly = useMemo(() => {
    const buckets: { sum: number; n: number }[] = HOURS.map(() => ({ sum: 0, n: 0 }))
    history.forEach((r) => {
      const h = new Date(r.timestamp).getHours()
      buckets[h].sum += predictFreshness(r).spoilageProbability / 100
      buckets[h].n += 1
    })
    return buckets.map((b) => (b.n ? b.sum / b.n : 0))
  }, [history])

  const daily = useMemo(() => {
    // Build a 7-day x 24-cell synthetic-from-real matrix using day-of-week buckets.
    const grid: number[][] = DAYS.map(() => HOURS.map(() => 0))
    const counts: number[][] = DAYS.map(() => HOURS.map(() => 0))
    history.forEach((r) => {
      const d = (new Date(r.timestamp).getDay() + 6) % 7
      const h = new Date(r.timestamp).getHours()
      grid[d][h] += predictFreshness(r).spoilageProbability / 100
      counts[d][h] += 1
    })
    return grid.map((row, d) => row.map((v, h) => (counts[d][h] ? v / counts[d][h] : 0)))
  }, [history])

  return (
    <div className="rounded-2xl border border-border glass p-5">
      <div className="flex items-center gap-2">
        <Grid3x3 className="size-4 text-primary" />
        <h2 className="font-heading text-lg font-semibold">Risk Heatmaps</h2>
      </div>

      <div className="mt-4">
        <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Hourly Spoilage Risk</div>
        <div className="flex flex-wrap gap-1">
          {hourly.map((v, i) => (
            <div
              key={i}
              title={`${i}:00 · ${(v * 100).toFixed(0)}%`}
              className="size-5 rounded-[4px] transition-transform hover:scale-125"
              style={{ background: `color-mix(in oklch, ${riskColor(v)} ${20 + v * 80}%, var(--secondary))` }}
            />
          ))}
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Daily Spoilage Map</div>
        <div className="flex flex-col gap-1">
          {daily.map((row, d) => (
            <div key={d} className="flex items-center gap-1">
              <span className="w-8 text-[0.65rem] text-muted-foreground">{DAYS[d]}</span>
              <div className="flex flex-1 gap-[3px]">
                {row.map((v, h) => (
                  <div
                    key={h}
                    title={`${DAYS[d]} ${h}:00 · ${(v * 100).toFixed(0)}%`}
                    className="h-3.5 flex-1 rounded-[3px]"
                    style={{ background: `color-mix(in oklch, ${riskColor(v)} ${15 + v * 85}%, var(--secondary))` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 text-[0.65rem] text-muted-foreground">
        <span>Low</span>
        {["var(--safe)", "var(--chart-2)", "var(--warn)", "var(--danger)"].map((c) => (
          <span key={c} className="size-3 rounded-[3px]" style={{ background: c }} />
        ))}
        <span>High</span>
      </div>
    </div>
  )
}
