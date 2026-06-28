"use client"

import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle } from "lucide-react"
import { type SensorReading, isSpoilageRisk } from "@/lib/analytics"
import { useThresholds } from "@/lib/thresholds-context"

export function SpoilageBanner({ current }: { current: SensorReading }) {
  const { thresholds } = useThresholds()
  const risk = isSpoilageRisk(current, thresholds)
  const reasons: string[] = []
  if (current.temperature > thresholds.temperature.critical)
    reasons.push(`Temp ${current.temperature.toFixed(1)}°C`)
  if (current.humidity > thresholds.humidity.critical)
    reasons.push(`Humidity ${current.humidity.toFixed(0)}%`)
  if (current.mq135 > thresholds.mq135.critical)
    reasons.push(`MQ135 ${Math.round(current.mq135)}ppm`)

  return (
    <AnimatePresence>
      {risk && (
        <motion.div
          initial={{ opacity: 0, y: -12, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -12, height: 0 }}
          className="overflow-hidden"
        >
          <div
            className="flex items-center gap-3 rounded-2xl border px-5 py-3.5"
            style={{
              borderColor: "color-mix(in oklch, var(--danger) 50%, transparent)",
              background: "color-mix(in oklch, var(--danger) 12%, transparent)",
            }}
          >
            <motion.span
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
              className="grid size-9 shrink-0 place-items-center rounded-full"
              style={{ background: "color-mix(in oklch, var(--danger) 25%, transparent)", color: "var(--danger)" }}
            >
              <AlertTriangle className="size-5" />
            </motion.span>
            <div className="min-w-0">
              <div className="font-semibold" style={{ color: "var(--danger)" }}>
                Spoilage Risk Detected
              </div>
              <div className="truncate text-sm text-muted-foreground">
                {reasons.join(" · ")} — immediate inspection recommended.
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
