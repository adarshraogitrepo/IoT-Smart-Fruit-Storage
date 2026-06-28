import { MarketControlPanel } from "@/components/market-control-panel"

export default function MarketTestPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-8 text-4xl font-bold">Market Decision System Test</h1>
        <p className="mb-6 text-muted-foreground">
          Test the Twilio WhatsApp market decision control panel
        </p>
        <MarketControlPanel />
      </div>
    </div>
  )
}
