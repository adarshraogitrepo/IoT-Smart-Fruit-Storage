"use client"

import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown, Send, Clock, AlertCircle } from "lucide-react"

interface Decision {
  decision: string | null
  timestamp?: number
  expiresAt?: number
  timeRemaining?: number
}

export function MarketControlPanel() {
  const [decision, setDecision] = useState<Decision | null>(null)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [phone, setPhone] = useState("")
  const [defaultPhone, setDefaultPhone] = useState("+918762894882")
  const [error, setError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState<string>("")
  const [useDefaultPhone, setUseDefaultPhone] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem("whatsappAlertPhone")
    if (saved) {
      setDefaultPhone(saved)
      setPhone(saved)
    } else {
      setPhone(defaultPhone)
    }
    fetchCurrentDecision()
    const interval = setInterval(fetchCurrentDecision, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (decision?.expiresAt) {
      const updateTimer = () => {
        const remaining = Math.max(0, decision.expiresAt! - Date.now())
        const hours = Math.floor(remaining / (1000 * 60 * 60))
        const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
        setTimeLeft(hours > 0 ? `${hours}h ${mins}m` : `${mins}m`)
      }
      updateTimer()
      const timer = setInterval(updateTimer, 60000)
      return () => clearInterval(timer)
    }
  }, [decision?.expiresAt])

  const fetchCurrentDecision = async () => {
    try {
      const res = await fetch("/api/market/decision")
      const data = await res.json()
      if (data.ok) {
        setDecision(data)
      }
    } catch (err) {
      console.error("[v0] Failed to fetch decision:", err)
    }
  }

  const handleDecision = async (selectedDecision: "SELL_NOW" | "SELL_LATER") => {
    setLoading(true)
    setError(null)

    try {
      // Determine which phone to use
      const phoneToUse = useDefaultPhone ? defaultPhone : (phone || defaultPhone)

      const res = await fetch("/api/market/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: selectedDecision,
          recipientPhone: phoneToUse || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to set decision")
      }

      setDecision(data)
      setPhone("")
      alert(`✅ Decision set to ${selectedDecision}\n📱 Alert sent to ${phoneToUse}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleSendTestAlert = async () => {
    setSending(true)
    setError(null)

    try {
      const phoneToUse = useDefaultPhone ? defaultPhone : (phone || defaultPhone)

      if (!phoneToUse) {
        throw new Error("No phone number configured")
      }

      const res = await fetch("/api/market/send-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toPhone: phoneToUse,
          decision: "TEST_ALERT",
          timestamp: Date.now(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to send test alert")
      }

      alert(`✅ Test alert sent to ${phoneToUse}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      setError(msg)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Market Control</h2>
        {decision?.decision && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Expires in {timeLeft}
            </span>
          </div>
        )}
      </div>

      {decision?.decision && (
        <div className="mb-6 rounded-lg bg-muted p-4">
          <div className="flex items-center gap-3">
            {decision.decision === "SELL_NOW" ? (
              <>
                <TrendingUp className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-600">SELL NOW Active</p>
                  <p className="text-sm text-muted-foreground">
                    Market decision is active - fruits ready for sale
                  </p>
                </div>
              </>
            ) : (
              <>
                <TrendingDown className="h-6 w-6 text-blue-600" />
                <div>
                  <p className="font-semibold text-blue-600">SELL LATER Active</p>
                  <p className="text-sm text-muted-foreground">
                    Maintaining quality for optimal market timing
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Alert Configuration Notice */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex gap-3">
          <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-primary">Default Alert Number Configured</p>
            <p className="text-xs text-muted-foreground mt-1">
              Primary: <span className="font-mono">{defaultPhone}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              To change, use the Settings panel (gear icon) → WhatsApp Alerts
            </p>
          </div>
        </div>

        {/* Test Phone Override */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="useTestPhone"
              checked={!useDefaultPhone}
              onChange={(e) => setUseDefaultPhone(!e.target.checked)}
              className="rounded border border-input"
            />
            <label htmlFor="useTestPhone" className="text-sm font-medium cursor-pointer">
              Override with test phone number
            </label>
          </div>
          {!useDefaultPhone && (
            <input
              type="tel"
              placeholder="Enter test number (e.g., +1234567890)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              disabled={loading || sending}
            />
          )}
          <p className="text-xs text-muted-foreground">
            {useDefaultPhone
              ? "Will use default number from settings"
              : "Enter a test number to override default settings"}
          </p>
        </div>

        <div className="grid gap-3 grid-cols-2">
          <button
            onClick={() => handleDecision("SELL_NOW")}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            <TrendingUp className="h-4 w-4" />
            Sell Now
          </button>
          <button
            onClick={() => handleDecision("SELL_LATER")}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <TrendingDown className="h-4 w-4" />
            Sell Later
          </button>
        </div>

        <button
          onClick={handleSendTestAlert}
          disabled={sending || loading}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          Send Test Alert
        </button>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!decision?.decision && (
          <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-700">
            No active decision. Select one above to get started.
          </div>
        )}
      </div>
    </div>
  )
}
