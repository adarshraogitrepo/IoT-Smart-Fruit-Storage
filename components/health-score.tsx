"use client"

import { motion } from "framer-motion"
import { ShieldCheck } from "lucide-react"
import {
  type SensorReading,
  healthScore,
  healthLabel,
} from "@/lib/analytics"

export function HealthScore({ current }: { current: SensorReading }) {
  const score = healthScore(current)
  const label = healthLabel(score)
  const color =
    score >= 70 ? "var(--safe)" : score >= 50 ? "var(--warn)" : "var(--danger)"

  const radius = 78
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - score / 100)

  return (
    <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-border glass p-6">
      <div className="flex items-center gap-2 self-start text-sm font-medium text-muted-foreground">
        <ShieldCheck className="size-4 text-primary" />
        Storage Health Score
      </div>

      <div className="relative mt-4 grid place-items-center">
        <svg width="200" height="200" viewBox="0 0 200 200" className="-rotate-90">
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="var(--secondary)"
            strokeWidth="14"
          />
          <motion.circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{ filter: `drop-shadow(0 0 8px ${color})` }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="font-mono text-5xl font-bold tabular-nums">{score}</span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>

      <span
        className="mt-4 rounded-full px-4 py-1.5 text-sm font-semibold"
        style={{ background: `color-mix(in oklch, ${color} 16%, transparent)`, color }}
      >
        {label}
      </span>
    </div>
  )
}
