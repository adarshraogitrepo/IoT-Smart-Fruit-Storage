import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const incomingMessage = formData.get("Body")?.toString().toUpperCase() || ""
    const from = formData.get("From")?.toString() || ""

    console.log(`[v0] Webhook received: ${incomingMessage} from ${from}`)

    // Parse the incoming message
    let decision: string | null = null
    if (incomingMessage.includes("SELL_NOW")) {
      decision = "SELL_NOW"
    } else if (incomingMessage.includes("SELL_LATER")) {
      decision = "SELL_LATER"
    }

    if (!decision) {
      return NextResponse.json({
        ok: true,
        message: "Message received but no decision detected",
      })
    }

    // Save decision to backend via API call to decisions endpoint
    try {
      const apiBaseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000"

      await fetch(`${apiBaseUrl}/api/decisions/latest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          respondedBy: from,
          respondedAt: Date.now(),
        }),
      })

      console.log(`[v0] Market decision saved: ${decision}`)
    } catch (err) {
      console.error("[v0] Error saving decision:", err)
    }

    // Send confirmation back
    const confirmationMsg =
      decision === "SELL_NOW"
        ? "✅ Confirmed: SELL NOW decision activated"
        : "✅ Confirmed: SELL LATER decision activated"

    return NextResponse.json({
      ok: true,
      decision,
      message: confirmationMsg,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] Webhook error:", message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
