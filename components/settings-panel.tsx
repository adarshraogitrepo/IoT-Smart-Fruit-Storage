"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Settings, X, RotateCcw, MessageCircle } from "lucide-react"
import { useThresholds, type Thresholds } from "@/lib/thresholds-context"

type MetricKey = keyof Thresholds

const METRIC_CONFIG: Record<
  MetricKey,
  { label: string; unit: string; min: number; max: number; step: number }
> = {
  temperature: { label: "Temperature", unit: "°C", min: 0, max: 50, step: 0.5 },
  humidity: { label: "Humidity", unit: "%", min: 30, max: 100, step: 1 },
  mq135: { label: "Air Quality (MQ135)", unit: "ppm", min: 100, max: 1000, step: 10 },
}

export function SettingsPanel() {
  const [open, setOpen] = useState(false)
  const [alertPhone, setAlertPhone] = useState("+918762894882")
  const [savedPhone, setSavedPhone] = useState("+918762894882")
  const { thresholds, setThreshold, reset } = useThresholds()

  useEffect(() => {
    const saved = localStorage.getItem("whatsappAlertPhone")
    if (saved) {
      setSavedPhone(saved)
      setAlertPhone(saved)
    }
  }, [])

  return (
    <>
      {/* Floating action button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open threshold settings"
        className="fixed bottom-6 right-6 z-40 grid size-13 place-items-center rounded-full border border-border glass-strong shadow-lg transition-transform hover:scale-105 active:scale-95"
        style={{ boxShadow: "0 0 24px color-mix(in oklch, var(--neon) 35%, transparent)" }}
      >
        <Settings className="size-5 text-primary" />
      </button>

      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Slide-over panel */}
      <AnimatePresence>
        {open && (
          <motion.aside
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-border glass-strong shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div>
                <h2 className="font-heading text-lg font-semibold">Threshold Settings</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Adjust warn/critical levels for each sensor metric.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close settings"
                className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
              {(Object.keys(METRIC_CONFIG) as MetricKey[]).map((metric) => {
                const cfg = METRIC_CONFIG[metric]
                const t = thresholds[metric]
                return (
                  <div key={metric} className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2 rounded-full"
                        style={{ background: "var(--primary)" }}
                      />
                      <h3 className="font-semibold text-sm uppercase tracking-wider">
                        {cfg.label}
                      </h3>
                      <span className="ml-auto text-xs text-muted-foreground font-mono">
                        ({cfg.unit})
                      </span>
                    </div>

                    <ThresholdSlider
                      label="Warn level"
                      color="var(--warn)"
                      value={t.warn}
                      min={cfg.min}
                      max={t.critical - cfg.step}
                      step={cfg.step}
                      unit={cfg.unit}
                      onChange={(v) => setThreshold(metric, "warn", v)}
                    />

                    <ThresholdSlider
                      label="Critical level"
                      color="var(--danger)"
                      value={t.critical}
                      min={t.warn + cfg.step}
                      max={cfg.max}
                      step={cfg.step}
                      unit={cfg.unit}
                      onChange={(v) => setThreshold(metric, "critical", v)}
                    />

                    {/* Visual reference bar */}
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{
                          background: "var(--safe)",
                          width: `${((t.warn - cfg.min) / (cfg.max - cfg.min)) * 100}%`,
                        }}
                      />
                      <div
                        className="absolute inset-y-0 rounded-full"
                        style={{
                          background: "var(--warn)",
                          left: `${((t.warn - cfg.min) / (cfg.max - cfg.min)) * 100}%`,
                          width: `${((t.critical - t.warn) / (cfg.max - cfg.min)) * 100}%`,
                        }}
                      />
                      <div
                        className="absolute inset-y-0 right-0 rounded-full"
                        style={{
                          background: "var(--danger)",
                          width: `${((cfg.max - t.critical) / (cfg.max - cfg.min)) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[0.65rem] text-muted-foreground font-mono">
                      <span>Safe</span>
                      <span>Warn &gt; {t.warn}{cfg.unit}</span>
                      <span>Critical &gt; {t.critical}{cfg.unit}</span>
                    </div>
                  </div>
                )
              })}

              {/* WhatsApp Alert Configuration */}
              <div className="space-y-4 border-t border-border pt-8">
                <div className="flex items-center gap-2">
                  <MessageCircle className="size-4" style={{ color: "var(--primary)" }} />
                  <h3 className="font-semibold text-sm uppercase tracking-wider">
                    WhatsApp Alerts
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Configure the default WhatsApp number for market decision alerts.
                </p>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Alert Recipient Number
                  </label>
                  <input
                    type="tel"
                    value={alertPhone}
                    onChange={(e) => setAlertPhone(e.target.value)}
                    placeholder="+918762894882"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-[0.65rem] text-muted-foreground">
                    Format: +[country code][number] (e.g., +918762894882)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSavedPhone(alertPhone)
                    localStorage.setItem("whatsappAlertPhone", alertPhone)
                  }}
                  className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Save Phone Number
                </button>
                <p className="text-[0.65rem] text-muted-foreground text-center">
                  Current: <span className="font-mono">{savedPhone}</span>
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border px-6 py-4">
              <button
                type="button"
                onClick={reset}
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground w-full justify-center"
              >
                <RotateCcw className="size-3.5" />
                Reset to defaults
              </button>
              <p className="mt-3 text-center text-[0.65rem] text-muted-foreground">
                Settings are saved locally and persist across sessions.
              </p>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}

function ThresholdSlider({
  label,
  color,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string
  color: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span
          className="font-mono text-sm font-semibold tabular-nums"
          style={{ color }}
        >
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer appearance-none rounded-full h-2 outline-none"
        style={{
          background: `linear-gradient(to right, ${color} 0%, ${color} ${((value - min) / (max - min)) * 100}%, var(--secondary) ${((value - min) / (max - min)) * 100}%, var(--secondary) 100%)`,
          accentColor: color,
        }}
        aria-label={label}
      />
      <div className="flex justify-between text-[0.6rem] text-muted-foreground font-mono">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}
