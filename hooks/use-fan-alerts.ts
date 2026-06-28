import { useEffect, useRef } from "react"

interface SensorData {
  temperature?: number
  humidity?: number
  mq135?: number
  fanStatus?: boolean
  fan?: number | boolean
}

export function useFanAlerts(current: SensorData | null) {
  const prevFanStatusRef = useRef<boolean | null>(null)
  const alertSentRef = useRef(false)

  useEffect(() => {
    if (!current) return

    // Get current fan status - check fanStatus field (boolean) first
    const currentFanStatus = current.fanStatus ?? (typeof current.fan === "boolean" ? current.fan : current.fan === 1)

    // Check if fan status changed from OFF to ON
    const fanTurnedOn = prevFanStatusRef.current === false && currentFanStatus === true
    const fanTurnedOff = prevFanStatusRef.current === true && currentFanStatus === false

    // Send alert when fan turns on
    if (fanTurnedOn && !alertSentRef.current) {
      console.log("[v0] Fan turned ON - sending alert")
      alertSentRef.current = true

      // Get saved phone number
      const savedPhone = localStorage.getItem("whatsappAlertPhone") || "+918762894882"

      // Determine reason for fan activation
      const tempThreshold = 28.0
      const mqThreshold = 500
      const tempVal = current?.temperature ?? 0
      const mqVal = current?.mq135 ?? 0
      const tempExceeded = tempVal >= tempThreshold
      const mqExceeded = mqVal >= mqThreshold

      let reasonStr = "Sensor threshold exceeded."
      if (tempExceeded && mqExceeded) {
        reasonStr = `Temperature (${tempVal.toFixed(1)}°C) and Air Quality (${mqVal.toFixed(0)} ppm) exceeded safety thresholds.`
      } else if (tempExceeded) {
        reasonStr = `Temperature (${tempVal.toFixed(1)}°C) exceeded threshold (${tempThreshold}°C).`
      } else if (mqExceeded) {
        reasonStr = `Air Quality (${mqVal.toFixed(0)} ppm) exceeded threshold (${mqThreshold} ppm).`
      }

      // Send WhatsApp alert with sensor data
      fetch("/api/market/send-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toPhone: savedPhone,
          temperature: tempVal,
          humidity: current?.humidity || 0,
          mq135: mqVal,
          reason: reasonStr,
          timestamp: Date.now(),
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.ok) {
            console.log("[v0] Fan ON alert sent successfully")
          } else {
            console.error("[v0] Failed to send fan ON alert:", data.error)
          }
        })
        .catch((err) => console.error("[v0] Error sending fan alert:", err))

      // Show browser notification
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Fan Activated", {
          body: "The storage unit fan has turned ON",
          icon: "/fan-icon.svg",
        })
      }
    }

    // Reset alert flag when fan turns off
    if (fanTurnedOff) {
      console.log("[v0] Fan turned OFF - resetting alert flag")
      alertSentRef.current = false
    }

    // Update previous status
    prevFanStatusRef.current = currentFanStatus
  }, [current?.fan, current?.fanStatus])

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }
  }, [])
}
