import { NextResponse } from "next/server"
import { setMarketDecision, getMarketDecision } from "@/lib/firebase-rest"

export async function POST(req: Request) {
  try {
    const { decision, recipientPhone } = await req.json()

    if (!decision || !["SELL_NOW", "SELL_LATER"].includes(decision)) {
      return NextResponse.json(
        { ok: false, error: "Invalid decision" },
        { status: 400 },
      )
    }

    const timestamp = Date.now()

    // Save decision to Firebase
    const decisionData = {
      decision,
      timestamp,
      expiresAt: timestamp + 24 * 60 * 60 * 1000, // 24 hours
      recipientPhone: recipientPhone || null,
      status: "ACTIVE",
    }

    await setMarketDecision(decisionData)
    console.log(`[v0] Market decision saved: ${decision}`)

    // Send WhatsApp notification if phone provided
    if (recipientPhone) {
      try {
        const response = await fetch(
          `${
            process.env.VERCEL_URL
              ? `https://${process.env.VERCEL_URL}`
              : "http://localhost:3000"
          }/api/market/send-whatsapp`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              toPhone: recipientPhone,
              decision,
              timestamp,
            }),
          },
        )

        const result = await response.json()
        console.log(
          `[v0] WhatsApp sent: ${result.ok ? "success" : result.error}`,
        )
      } catch (err) {
        console.error("[v0] Failed to send WhatsApp:", err)
        // Don't fail the whole request if WhatsApp fails
      }
    }

    return NextResponse.json({
      ok: true,
      decision,
      timestamp,
      message: `Decision "${decision}" has been activated`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] Market decision error:", message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const data = await getMarketDecision()

    if (!data) {
      return NextResponse.json({
        ok: true,
        decision: null,
        message: "No active decision",
      })
    }

    // Check if decision has expired
    if (data.expiresAt && data.expiresAt < Date.now()) {
      return NextResponse.json({
        ok: true,
        decision: null,
        message: "Decision expired",
      })
    }

    return NextResponse.json({
      ok: true,
      decision: data.decision,
      timestamp: data.timestamp,
      expiresAt: data.expiresAt,
      timeRemaining: Math.max(0, data.expiresAt - Date.now()),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] Get decision error:", message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
