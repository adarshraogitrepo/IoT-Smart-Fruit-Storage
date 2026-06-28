"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import {
  type SensorReading,
  isSpoilageRisk,
  statusFor,
} from "@/lib/analytics"
import type { Thresholds } from "@/lib/thresholds-context"

export type Notification = {
  id: string
  tone: "info" | "warn" | "danger" | "good"
  title: string
  detail: string
  time: number
}

export type AlertConfig = {
  enabled: boolean
  phone: string
  cooldownMs: number
}

const LS_KEY = "sfs-alert-config"
// Legacy/shared key also read by useFanAlerts and the settings panel.
const PHONE_KEY = "whatsappAlertPhone"

function loadConfig(): AlertConfig {
  if (typeof window === "undefined") return { enabled: false, phone: "", cooldownMs: 120000 }
  try {
    const raw = window.localStorage.getItem(LS_KEY)
    const legacyPhone = window.localStorage.getItem(PHONE_KEY) || ""
    if (raw) {
      const parsed = JSON.parse(raw)
      return { cooldownMs: 120000, enabled: false, phone: legacyPhone, ...parsed }
    }
    if (legacyPhone) return { enabled: false, phone: legacyPhone, cooldownMs: 120000 }
  } catch {}
  return { enabled: false, phone: "", cooldownMs: 120000 }
}

export function useAlerts(current: SensorReading | null, thresholds?: Thresholds) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [config, setConfig] = useState<AlertConfig>(loadConfig)
  const [lastSent, setLastSent] = useState<number | null>(null)
  const [sending, setSending] = useState(false)
  const lastStateRef = useRef<Record<string, string>>({})
  const lastWhatsRef = useRef<number>(0)
  const lastPeriodicRef = useRef<number>(0)

  const push = useCallback((n: Omit<Notification, "id" | "time">) => {
    setNotifications((prev) =>
      [{ ...n, id: crypto.randomUUID(), time: Date.now() }, ...prev].slice(0, 40),
    )
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(config))
      // Keep the shared phone key in sync for useFanAlerts / settings panel.
      if (config.phone) window.localStorage.setItem(PHONE_KEY, config.phone)
    } catch {}
  }, [config])

  const sendWhatsApp = useCallback(
    async (reading: SensorReading, manual = false) => {
      if (!config.phone) {
        if (manual) push({ tone: "warn", title: "No recipient", detail: "Add a phone number in alert settings first." })
        return
      }
      setSending(true)
      try {
        const res = await fetch("/api/alert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: config.phone, reading }),
        })
        const data = await res.json()
        if (res.ok && data.ok) {
          setLastSent(Date.now())
          push({ tone: "info", title: "WhatsApp alert sent", detail: `Delivered to ${config.phone}` })
        } else {
          push({ tone: "warn", title: "WhatsApp failed", detail: data.error || "Could not send alert." })
        }
      } catch {
        push({ tone: "warn", title: "WhatsApp failed", detail: "Network error contacting alert service." })
      } finally {
        setSending(false)
      }
    },
    [config.phone, push],
  )

  // Periodic status update: send WhatsApp every 60 seconds with current readings
  useEffect(() => {
    if (!config.enabled || !config.phone || !current) return

    const sendPeriodicUpdate = async () => {
      const now = Date.now()
      if (now - lastPeriodicRef.current < 60000) return // Only send if 60s+ have passed

      lastPeriodicRef.current = now
      try {
        const status = isSpoilageRisk(current, thresholds) ? "⚠️ DANGER" : "✅ OK"
        const tempSafe = current.temperature != null ? current.temperature.toFixed(1) : "N/A"
        const humSafe = current.humidity != null ? current.humidity.toFixed(0) : "N/A"
        const aqSafe = current.mq135 != null ? Math.round(current.mq135) : "N/A"
        const msg = `[Status Update]\n${status}\n\nTemp: ${tempSafe}°C\nHumidity: ${humSafe}%\nAir Quality: ${aqSafe} ppm`

        const res = await fetch("/api/alert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: config.phone, reading: current, message: msg }),
        })
        if (!res.ok) {
          console.error("[v0] Periodic alert failed:", await res.text())
        }
      } catch (err) {
        console.error("[v0] Periodic alert error:", err)
      }
    }

    const interval = setInterval(sendPeriodicUpdate, 60000) // Check every 60 seconds
    sendPeriodicUpdate() // Send immediately on first load
    return () => clearInterval(interval)
  }, [config.enabled, config.phone, current, thresholds])

  // Watch readings: emit notifications on state transitions, fire WhatsApp on spoilage.
  useEffect(() => {
    if (!current) return
    const metrics = ["temperature", "humidity", "mq135"] as const
    const names: Record<string, string> = {
      temperature: "Temperature",
      humidity: "Humidity",
      mq135: "Air quality",
    }

    let worst: "safe" | "warn" | "danger" = "safe"
    const offenders: string[] = []

    metrics.forEach((m) => {
      const s = statusFor(m, current[m], thresholds)
      const prev = lastStateRef.current[m]
      if (prev && prev !== s) {
        if (s === "safe") {
          push({ tone: "good", title: `${names[m]} normalized`, detail: `${names[m]} back within safe range.` })
        } else {
          push({
            tone: s === "danger" ? "danger" : "warn",
            title: `${names[m]} ${s === "danger" ? "critical" : "warning"}`,
            detail: `${names[m]} ${s === "danger" ? "exceeded the critical threshold" : "is approaching unsafe levels"}.`,
          })
        }
      }
      lastStateRef.current[m] = s
      if (s !== "safe") offenders.push(names[m])
      if (s === "danger") worst = "danger"
      else if (s === "warn" && worst !== "danger") worst = "warn"
    })

    // Fire a WhatsApp alert whenever any metric is in warn or danger (respecting cooldown).
    if (worst !== "safe") {
      const now = Date.now()
      if (now - lastWhatsRef.current > config.cooldownMs) {
        lastWhatsRef.current = now
        push({
          tone: worst,
          title: worst === "danger" ? "Critical conditions detected" : "Conditions need attention",
          detail: `${offenders.join(", ")} ${offenders.length > 1 ? "are" : "is"} outside the safe range.`,
        })
        if (config.enabled && config.phone) {
          const status = worst === "danger" ? "🚨 CRITICAL" : "⚠️ WARNING"
          const tempSafe = current.temperature != null ? current.temperature.toFixed(1) : "N/A"
          const humSafe = current.humidity != null ? current.humidity.toFixed(0) : "N/A"
          const aqSafe = current.mq135 != null ? Math.round(current.mq135) : "N/A"
          const msg = `[Smart Fruit Storage]\n${status}\n\n${offenders.join(", ")} outside safe range.\n\nTemp: ${tempSafe}°C\nHumidity: ${humSafe}%\nAir Quality: ${aqSafe} ppm`
          fetch("/api/alert", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: config.phone, reading: current, message: msg }),
          }).catch((err) => console.error("[v0] Threshold alert failed:", err))
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.timestamp])

  return {
    notifications,
    config,
    setConfig,
    lastSent,
    sending,
    sendWhatsApp,
    clear: () => setNotifications([]),
  }
}
