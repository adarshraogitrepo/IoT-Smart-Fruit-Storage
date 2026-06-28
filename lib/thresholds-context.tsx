"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

export type ThresholdPair = { warn: number; critical: number }

export type Thresholds = {
  temperature: ThresholdPair
  humidity: ThresholdPair
  mq135: ThresholdPair
}

const DEFAULTS: Thresholds = {
  temperature: { warn: 26, critical: 30 },
  humidity: { warn: 75, critical: 80 },
  mq135: { warn: 450, critical: 600 },
}

const LS_KEY = "sfs-thresholds"

function loadThresholds(): Thresholds {
  if (typeof window === "undefined") return DEFAULTS
  try {
    const raw = window.localStorage.getItem(LS_KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {}
  return DEFAULTS
}

type ThresholdsCtx = {
  thresholds: Thresholds
  setThreshold: (
    metric: keyof Thresholds,
    level: "warn" | "critical",
    value: number,
  ) => void
  reset: () => void
}

const Ctx = createContext<ThresholdsCtx | null>(null)

export function ThresholdsProvider({ children }: { children: ReactNode }) {
  const [thresholds, setThresholds] = useState<Thresholds>(loadThresholds)

  const setThreshold = useCallback(
    (metric: keyof Thresholds, level: "warn" | "critical", value: number) => {
      setThresholds((prev) => {
        const next = {
          ...prev,
          [metric]: { ...prev[metric], [level]: value },
        }
        try {
          window.localStorage.setItem(LS_KEY, JSON.stringify(next))
        } catch {}
        return next
      })
    },
    [],
  )

  const reset = useCallback(() => {
    setThresholds(DEFAULTS)
    try {
      window.localStorage.removeItem(LS_KEY)
    } catch {}
  }, [])

  return <Ctx.Provider value={{ thresholds, setThreshold, reset }}>{children}</Ctx.Provider>
}

export function useThresholds(): ThresholdsCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useThresholds must be used inside ThresholdsProvider")
  return ctx
}

/** Derived helpers that mirror the static analytics.ts functions but use live thresholds */
export type Status = "safe" | "warn" | "danger"

export function statusForValue(
  value: number,
  t: ThresholdPair,
): Status {
  if (value >= t.critical) return "danger"
  if (value >= t.warn) return "warn"
  return "safe"
}
