"use client"

import { useEffect, useState } from "react"
import { ref, get } from "firebase/database"
import { getFirebaseDb } from "@/lib/firebase"
import type { SensorReading } from "@/lib/analytics"

export type DataSource = "firebase" | "connecting" | "error"

export function useSensorData() {
  const [current, setCurrent] = useState<SensorReading | null>(null)
  const [source, setSource] = useState<DataSource>("connecting")

  useEffect(() => {
    const db = getFirebaseDb()
    if (!db) {
      setSource("error")
      return
    }

    const fetchLatestReading = async () => {
      try {
        const logsRef = ref(db, "sensorLogs")
        const snap = await get(logsRef)
        const val = snap.val()

        if (!val) {
          console.log("[v0] No sensorLogs yet")
          setSource("connecting")
          return
        }

        // Convert entries to array, sort by epoch (descending), take latest
        const entries = Object.entries(val).map(([key, entry]: [string, any]) => ({
          key,
          temperature: Number(entry.temperature) || 0,
          humidity: Number(entry.humidity) || 0,
          mq135: Number(entry.mq135) || 0,
          fanStatus: Boolean(entry.fanStatus) || false,
          timestamp: parseTimestamp(entry),
          epoch: Number(entry.epoch) || 0,
        }))

        // Sort by epoch descending (latest first)
        entries.sort((a, b) => b.epoch - a.epoch)

        if (entries.length > 0) {
          const latest = entries[0]
          const reading: SensorReading = {
            temperature: latest.temperature,
            humidity: latest.humidity,
            mq135: latest.mq135,
            fanStatus: latest.fanStatus,
            timestamp: latest.timestamp,
          }
          console.log("[v0] Latest reading:", reading)
          setCurrent(reading)
          setSource("firebase")
        }
      } catch (err) {
        console.error("[v0] Firebase fetch error:", err)
        setSource("error")
      }
    }

    // Fetch immediately
    fetchLatestReading()

    // Poll every 5 seconds
    const interval = setInterval(fetchLatestReading, 5000)

    return () => clearInterval(interval)
  }, [])

  return { current, source }
}

function parseTimestamp(entry: any): number {
  // Try epoch field first (comes in seconds, convert to ms)
  if (typeof entry.epoch === "number") {
    return entry.epoch * 1000
  }
  // Fallback to ISO string timestamp
  if (typeof entry.timestamp === "string") {
    const parsed = new Date(entry.timestamp).getTime()
    if (!isNaN(parsed)) {
      return parsed
    }
  }
  // Fallback to number timestamp (assume milliseconds)
  if (typeof entry.timestamp === "number") {
    return entry.timestamp
  }
  return Date.now()
}
