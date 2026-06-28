"use client"

import { useSensorApi } from "@/hooks/use-sensor-api"
import { useAlerts } from "@/hooks/use-alerts"
import { useThresholds, ThresholdsProvider } from "@/lib/thresholds-context"
import { Hero } from "@/components/hero"
import { SpoilageBanner } from "@/components/spoilage-banner"
import { MetricCards } from "@/components/metric-cards"
import { HealthScore } from "@/components/health-score"
import { AnalyticsCharts } from "@/components/analytics-charts"
import { FreshnessPredictor } from "@/components/freshness-predictor"
import { PredictiveAnalytics } from "@/components/predictive-analytics"
import { InsightsPanel } from "@/components/insights-panel"
import { HeatmapAnalytics } from "@/components/heatmap-analytics"
import { DigitalTwin } from "@/components/digital-twin"
import { NotificationCenter } from "@/components/notification-center"
import { AlertSettings } from "@/components/alert-settings"
import { ExportControls } from "@/components/export-controls"
import { SettingsPanel } from "@/components/settings-panel"
import { MarketControlPanel } from "@/components/market-control-panel"
import { WifiOff, Loader2 } from "lucide-react"

function DashboardInner() {
  const { current, isConnected, isLoading } = useSensorApi()
  const { thresholds } = useThresholds()
  const alerts = useAlerts(current, thresholds)
  
  // Convert current sensor data to history format for compatibility
  const history = current ? [current] : []
  const source = isConnected ? "firebase" : "offline"

  if (isLoading || !current) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-center text-sm text-muted-foreground">
            {isLoading ? "Connecting to sensor data..." : "No sensor data available yet"}
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
      <Hero source={source} />

      {source === "error" ? (
        <div className="mt-16 flex flex-col items-center gap-4 text-center text-muted-foreground">
          <WifiOff className="size-12 opacity-40" />
          <p className="text-lg font-medium">Cannot connect to Firebase</p>
          <p className="text-sm">Check that your environment variables are set correctly.</p>
        </div>
      ) : !current ? (
        <div className="mt-16 flex flex-col items-center gap-4 text-center text-muted-foreground">
          <Loader2 className="size-10 animate-spin opacity-50" />
          <p className="text-base font-medium">Waiting for sensor data&hellip;</p>
          <p className="text-sm opacity-70">
            Make sure your ESP32 is online and writing to{" "}
            <code className="font-mono text-primary">/sensor</code> in Firebase.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <SpoilageBanner current={current} />

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-heading text-xl font-semibold">Live Telemetry</h2>
            <ExportControls history={history} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <MetricCards current={current} history={history} />
            </div>
            <HealthScore current={current} />
          </div>

          <AnalyticsCharts history={history} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <FreshnessPredictor current={current} />
            <PredictiveAnalytics history={history} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <DigitalTwin current={current} />
            <div className="lg:col-span-2">
              <HeatmapAnalytics history={history} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <InsightsPanel current={current} history={history} />
            <AlertSettings
              config={alerts.config}
              setConfig={alerts.setConfig}
              current={current}
              sendWhatsApp={alerts.sendWhatsApp}
              sending={alerts.sending}
              lastSent={alerts.lastSent}
            />
            <NotificationCenter notifications={alerts.notifications} onClear={alerts.clear} />
          </div>

          <div className="pt-4">
            <MarketControlPanel />
          </div>

          <footer className="pt-4 text-center text-xs text-muted-foreground">
            Smart Fruit Storage · AI-Powered Spoilage Prevention · Real-time ESP32 telemetry
          </footer>
        </div>
      )}

      {/* Floating settings panel — always visible */}
      <SettingsPanel />
    </main>
  )
}

export function Dashboard() {
  return (
    <ThresholdsProvider>
      <DashboardInner />
    </ThresholdsProvider>
  )
}
