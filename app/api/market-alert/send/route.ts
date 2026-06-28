import { NextResponse } from "next/server"
import twilio from "twilio"

export async function POST(req: Request) {
  try {
    const { phone, decision, temperature, humidity, mq135 } = await req.json()

    if (!phone || !decision) {
      return NextResponse.json(
        { ok: false, error: "Missing phone or decision" },
        { status: 400 }
      )
    }

    const sid = process.env.TWILIO_ACCOUNT_SID
    const token = process.env.TWILIO_AUTH_TOKEN
    const from = process.env.TWILIO_WHATSAPP_FROM

    if (!sid || !token || !from) {
      return NextResponse.json(
        { ok: false, error: "Twilio is not configured" },
        { status: 500 }
      )
    }

    const decisionText =
      decision === "SELL_NOW"
        ? "🟢 SELL NOW - Market conditions are favorable for immediate sale"
        : "🔵 SELL LATER - Current market prices suggest waiting"

    const body = [
      "📊 Market Decision Alert",
      "",
      decisionText,
      "",
      `Current Conditions:`,
      `Temperature: ${temperature?.toFixed(1) || "N/A"}°C`,
      `Humidity: ${humidity?.toFixed(0) || "N/A"}%`,
      `Air Quality: ${mq135?.toFixed(1) || "N/A"} ppm`,
      "",
      "Reply SELL_NOW or SELL_LATER to confirm",
    ].join("\n")

    const client = twilio(sid, token)
    const fromAddr = from.startsWith("whatsapp:") ? from : `whatsapp:${from}`
    const toAddr = phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`

    const msg = await client.messages.create({
      from: fromAddr,
      to: toAddr,
      body,
    })

    console.log(`[v0] Market alert sent: ${decision}`)

    return NextResponse.json({
      ok: true,
      messageId: msg.sid,
      decision,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] Market alert error:", message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
