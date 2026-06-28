"use client"

import { motion } from "framer-motion"
import { Box, Fan } from "lucide-react"
import {
  type SensorReading,
  healthScore,
  statusFor,
  isSpoilageRisk,
} from "@/lib/analytics"

export function DigitalTwin({ current }: { current: SensorReading }) {
  const score = healthScore(current)
  const tempStatus = statusFor("temperature", current.temperature)
  const risk = isSpoilageRisk(current)
  const glow =
    score >= 70 ? "var(--safe)" : score >= 50 ? "var(--warn)" : "var(--danger)"
  // Fan speed scales with temperature severity.
  const fanSpeed = tempStatus === "danger" ? 0.6 : tempStatus === "warn" ? 1.4 : 3

  return (
    <div className="rounded-2xl border border-border glass p-5">
      <div className="flex items-center gap-2">
        <Box className="size-4 text-primary" />
        <h2 className="font-heading text-lg font-semibold">Digital Twin</h2>
        <span className="ml-auto text-xs text-muted-foreground">Live chamber view</span>
      </div>

      <div className="relative mt-4 grid place-items-center overflow-hidden rounded-xl border border-border bg-card/30 py-8">
        <motion.div
          className="absolute inset-0"
          animate={{ opacity: [0.25, 0.45, 0.25] }}
          transition={{ duration: 3, repeat: Infinity }}
          style={{
            background: `radial-gradient(ellipse 60% 50% at 50% 55%, color-mix(in oklch, ${glow} 35%, transparent), transparent 70%)`,
          }}
        />

        {/* Cooling fan */}
        <div className="absolute right-4 top-4 flex flex-col items-center gap-1">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, ease: "linear", duration: fanSpeed }}
            style={{ color: glow }}
          >
            <Fan className="size-7" />
          </motion.div>
          <span className="font-mono text-[0.6rem] text-muted-foreground">COOLING</span>
        </div>

        {/* Storage box */}
        <div
          className="relative flex h-36 w-52 items-end justify-center gap-2 rounded-lg border-2 px-3 pb-3"
          style={{
            borderColor: `color-mix(in oklch, ${glow} 60%, transparent)`,
            background: `color-mix(in oklch, ${glow} 8%, var(--card))`,
            boxShadow: `0 0 40px -8px ${glow}`,
          }}
        >
          {/* Fruits */}
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.span
              key={i}
              className="block rounded-full"
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 2 + i * 0.2, repeat: Infinity, ease: "easeInOut" }}
              style={{
                width: 22 + (i % 2) * 6,
                height: 22 + (i % 2) * 6,
                background: `color-mix(in oklch, ${risk ? "var(--danger)" : "var(--chart-3)"} 70%, var(--card))`,
                border: `1px solid color-mix(in oklch, ${risk ? "var(--danger)" : "var(--warn)"} 60%, transparent)`,
              }}
            />
          ))}

          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full border border-border bg-card px-2 py-0.5 font-mono text-[0.6rem] text-muted-foreground">
            STORAGE CHAMBER
          </span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Temp", value: `${current.temperature.toFixed(1)}°C` },
          { label: "Humidity", value: `${current.humidity.toFixed(0)}%` },
          { label: "Air", value: `${Math.round(current.mq135)}` },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border py-2">
            <div className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className="font-mono text-sm font-semibold">{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
