import { useState, useEffect, useCallback } from "react"

export interface MarketDecision {
  decision: "SELL_NOW" | "SELL_LATER" | "NONE"
  temperature?: number
  humidity?: number
  mq135?: number
  fanSuggestion?: number
  sentAt?: number
  expiresAt?: number
  timeRemaining?: number
  expired?: boolean
}

export function useMarketDecisions() {
  const [decision, setDecision] = useState<MarketDecision>({ decision: "NONE" })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchDecision = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/decisions/latest")

      if (!response.ok) {
        throw new Error("Failed to fetch market decision")
      }

      const data: MarketDecision = await response.json()
      setDecision(data)
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      console.error("[v0] Failed to fetch market decision:", message)
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial fetch
    fetchDecision()

    // Poll for updates every 10 seconds
    const interval = setInterval(fetchDecision, 10000)

    return () => clearInterval(interval)
  }, [fetchDecision])

  const sendDecision = useCallback(
    async (newDecision: "SELL_NOW" | "SELL_LATER", temp?: number, humidity?: number, mq135?: number) => {
      try {
        setLoading(true)
        const response = await fetch("/api/decisions/latest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision: newDecision,
            temperature: temp,
            humidity: humidity,
            mq135: mq135,
            fanSuggestion: newDecision === "SELL_NOW" ? 1 : 0,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to save decision")
        }

        await fetchDecision()
        return { ok: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error"
        console.error("[v0] Failed to send decision:", message)
        setError(message)
        return { ok: false, error: message }
      } finally {
        setLoading(false)
      }
    },
    [fetchDecision],
  )

  return {
    decision,
    loading,
    error,
    lastUpdated,
    fetchDecision,
    sendDecision,
  }
}
