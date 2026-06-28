import { NextResponse } from "next/server"

const FIREBASE_DB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL

export async function GET() {
  try {
    if (!FIREBASE_DB_URL) {
      // Return simulated mock sensor data for local development
      const time = Date.now()
      // Generate some nice oscillating values around typical sensor thresholds
      const temperature = 24.5 + Math.sin(time / 30000) * 4 // Oscillates between 20.5 and 28.5
      const humidity = 65 + Math.cos(time / 30000) * 15 // Oscillates between 50% and 80%
      const mq135 = 350 + Math.sin(time / 60000) * 200 // Oscillates between 150 and 550 ppm
      const fanStatus = temperature > 26

      return NextResponse.json({
        ok: true,
        data: {
          temperature,
          humidity,
          mq135,
          fanStatus,
          marketDecision: "NONE",
          timestamp: new Date(time).toISOString(),
          epoch: Math.floor(time / 1000),
        },
      })
    }

    // Fetch latest sensor data from Firebase using REST API (no auth needed)
    const url = `${FIREBASE_DB_URL}/sensor.json`
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 0 } // Disable fetch cache
    })

    if (!response.ok) {
      console.log(`[v0] Sensor data not found: ${response.statusText}`)
      return NextResponse.json({
        ok: true,
        data: null,
        message: "No sensor data available yet",
      })
    }

    const data = await response.json()

    // If Firebase database is empty (returns null), return default/initial sensor state
    if (!data) {
      return NextResponse.json({
        ok: true,
        data: {
          temperature: 22.0,
          humidity: 60.0,
          mq135: 300.0,
          fanStatus: false,
          marketDecision: "NONE",
          timestamp: new Date().toISOString(),
          epoch: Math.floor(Date.now() / 1000),
        },
      })
    }

    return NextResponse.json({
      ok: true,
      data: {
        temperature: typeof data.temperature === 'number' ? data.temperature : 0,
        humidity: typeof data.humidity === 'number' ? data.humidity : 0,
        mq135: typeof data.mq135 === 'number' ? data.mq135 : 0,
        fanStatus: !!data.fanStatus,
        marketDecision: data.marketDecision || "NONE",
        timestamp: data.timestamp || new Date().toISOString(),
        epoch: data.epoch || Math.floor(Date.now() / 1000),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] Sensor API error:", message)
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    )
  }
}
