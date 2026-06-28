import { NextResponse } from "next/server"
import twilio from "twilio"

type AlertRequest = {
  phone: string
  decision: "SELL_NOW" | "SELL_LATER" | "NONE"
  temperature: number
  humidity: number
  mq135: number
}

export async function POST(req: Request) {
  try {
    const { phone, decision, temperature, humidity, mq135 } = (await req.json()) as AlertRequest

    if (!phone || !decision) {
      return NextResponse.json({ ok: false, error: "Missing phone or decision" }, { status: 400 })
    }

    const sid = process.env.TWILIO_ACCOUNT_SID
    const token = process.env.TWILIO_AUTH_TOKEN
    const from = process.env.TWILIO_WHATSAPP_FROM

    if (!sid || !token || !from) {
      return NextResponse.json(
        { ok: false, error: "Twilio is not configured on the server." },
        { status: 500 },
      )
    }

    // Build alert message with sensor readings
    let alertBody = "🚨 Smart Fruit Storage Alert\n\n"
    alertBody += `Temperature: ${temperature?.toFixed(1) || "N/A"}°C\n`
    alertBody += `Humidity: ${humidity?.toFixed(0) || "N/A"}%\n`
    alertBody += `Air Quality: ${mq135?.toFixed(1) || "N/A"} ppm\n\n`

    if (decision === "SELL_NOW") {
      alertBody += "📊 Current Market Conditions: FAVORABLE FOR IMMEDIATE SALE\n\n"
      alertBody += "Recommendation: Sell now to maximize profit!\n"
      alertBody += "The fan will work at optimal speed to maintain fruit quality during transit.\n\n"
    } else if (decision === "SELL_LATER") {
      alertBody += "📊 Current Market Conditions: BETTER PRICES EXPECTED LATER\n\n"
      alertBody += "Recommendation: Wait for better market conditions.\n"
      alertBody += "The fan will maintain aggressive storage conditions to preserve fruit freshness.\n\n"
    } else {
      alertBody +=
        "📊 Standard monitoring continues. No market decision available.\n\n"
    }

    alertBody += "What would you like to do?\n"
    alertBody += "1️⃣ Reply 'Sell Now' to sell immediately\n"
    alertBody += "2️⃣ Reply 'Sell Later' to wait for better prices"

    const client = twilio(sid, token)
    const fromAddr = from.startsWith("whatsapp:") ? from : `whatsapp:${from}`
    const toAddr = phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`

    const msg = await client.messages.create({
      from: fromAddr,
      to: toAddr,
      body: alertBody,
    })

    console.log(`[v0] Alert sent to ${toAddr}: ${decision}`)

    return NextResponse.json({ ok: true, sid: msg.sid })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error sending alert"
    console.error("[v0] Alert error:", message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
