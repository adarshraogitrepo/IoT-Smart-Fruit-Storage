"use client"

import { useState } from "react"
import { useMarketDecisions } from "@/hooks/use-market-decisions"
import { TrendingUp, TrendingDown, Clock, Send } from "lucide-react"

export function MarketDecisionPanel() {
  const { decision, loading, error, sendDecision } = useMarketDecisions()
  const [sendingAlert, setSendingAlert] = useState(false)
  const [alertError, setAlertError] = useState<string | null>(null)
  const [alertPhone, setAlertPhone] = useState("")

  const handleSellNow = async () => {
    await sendDecision("SELL_NOW")
  }

  const handleSellLater = async () => {
    await sendDecision("SELL_LATER")
  }

  const handleSendAlert = async () => {
    if (!alertPhone) {
      setAlertError("Please enter a phone number")
      return
    }

    setSendingAlert(true)
    setAlertError(null)

    try {
      const response = await fetch("/api/market-alert/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: alertPhone,
          decision: decision?.decision || "NONE",
          temperature: decision?.temperature,
          humidity: decision?.humidity,
          mq135: decision?.mq135,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send alert")
      }

      setAlertPhone("")
      setAlertError(null)
      alert("✅ Market decision alert sent via WhatsApp!")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setAlertError(message)
    } finally {
      setSendingAlert(false)
    }
  }

  const getDecisionColor = (dec: string) => {
    switch (dec) {
      case "SELL_NOW":
        return "bg-green-50 border-green-200"
      case "SELL_LATER":
        return "bg-blue-50 border-blue-200"
      default:
        return "bg-gray-50 border-gray-200"
    }
  }

  const getDecisionIcon = (dec: string) => {
    switch (dec) {
      case "SELL_NOW":
        return <TrendingUp className="size-5 text-green-600" />
      case "SELL_LATER":
        return <TrendingDown className="size-5 text-blue-600" />
      default:
        return <Clock className="size-5 text-gray-600" />
    }
  }

  const getDecisionLabel = (dec: string) => {
    switch (dec) {
      case "SELL_NOW":
        return "Sell Now - Market Favorable"
      case "SELL_LATER":
        return "Sell Later - Wait for Better Prices"
      default:
        return "No Decision Yet"
    }
  }

  const formatTimeRemaining = (ms: number) => {
    if (!ms || ms < 0) return "Expired"
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m remaining`
  }

  return (
    <div className={`rounded-lg border p-4 ${getDecisionColor(decision?.decision || "NONE")}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {getDecisionIcon(decision?.decision || "NONE")}
          <div>
            <h3 className="font-semibold text-gray-900">Market Decision</h3>
            <p className="text-sm text-gray-600">{getDecisionLabel(decision?.decision || "NONE")}</p>
          </div>
        </div>
      </div>

      {decision?.decision !== "NONE" && decision?.timeRemaining && (
        <div className="mt-3 space-y-2 border-t border-current border-opacity-10 pt-3">
          <p className="text-xs font-medium text-gray-600">
            {formatTimeRemaining(decision.timeRemaining)}
          </p>
          {decision.temperature !== undefined && (
            <p className="text-xs text-gray-600">
              Temp: {decision.temperature.toFixed(1)}°C | Humidity: {decision.humidity?.toFixed(0)}% | Air Quality: {decision.mq135?.toFixed(1)} ppm
            </p>
          )}
          {decision.fanSuggestion === 1 && (
            <p className="text-xs font-medium text-green-700">Fan: ON (Active preservation mode)</p>
          )}
        </div>
      )}

      {error && (
        <div className="mt-3 rounded bg-red-100 p-2 text-xs text-red-700">
          Error: {error}
        </div>
      )}

      {!loading && decision?.decision === "NONE" && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleSellNow}
            className="flex-1 rounded bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
            disabled={loading}
          >
            Sell Now
          </button>
          <button
            onClick={handleSellLater}
            className="flex-1 rounded bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
          >
            Sell Later
          </button>
        </div>
      )}

      {decision?.decision !== "NONE" && (
        <div className="mt-4 space-y-3 border-t border-current border-opacity-10 pt-3">
          <p className="text-xs font-medium text-gray-600">Send WhatsApp Alert</p>
          <div className="flex gap-2">
            <input
              type="tel"
              placeholder="Phone (e.g., +1234567890)"
              value={alertPhone}
              onChange={(e) => setAlertPhone(e.target.value)}
              className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
              disabled={sendingAlert}
            />
            <button
              onClick={handleSendAlert}
              disabled={sendingAlert || !alertPhone}
              className="rounded bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1"
            >
              <Send className="w-3 h-3" />
              Send
            </button>
          </div>
          {alertError && (
            <p className="text-xs text-red-600">{alertError}</p>
          )}
        </div>
      )}
    </div>
  )
}
