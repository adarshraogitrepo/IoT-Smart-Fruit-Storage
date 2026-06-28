import { NextResponse } from "next/server"
import twilio from "twilio"

export async function POST(req: Request) {
  try {
    const { toPhone, decision, temperature, humidity, mq135, reason, timestamp } = await req.json()

    if (!toPhone) {
      return NextResponse.json({ ok: false, error: "Phone number required" }, { status: 400 })
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromPhone = process.env.TWILIO_WHATSAPP_FROM

    if (!accountSid || !authToken || !fromPhone) {
      console.error("[v0] Missing Twilio credentials")
      return NextResponse.json({ ok: false, error: "Twilio not configured" }, { status: 500 })
    }

    const client = twilio(accountSid, authToken)

    // Format phone numbers for WhatsApp
    const formattedToPhone = toPhone.startsWith("whatsapp:") ? toPhone : `whatsapp:${toPhone}`
    const formattedFromPhone = fromPhone.startsWith("whatsapp:") ? fromPhone : `whatsapp:${fromPhone}`

    // Guard: Twilio rejects messages where the recipient equals the sender (error 63031).
    if (formattedToPhone.replace(/\s+/g, "") === formattedFromPhone.replace(/\s+/g, "")) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "The alert recipient number is the same as the Twilio sender number. Enter YOUR personal WhatsApp number in Settings, not the Twilio sandbox number.",
        },
        { status: 400 },
      )
    }

    // Format sensor data
    const tempStr = typeof temperature === "number" ? `${temperature.toFixed(1)}°C` : "N/A"
    const humStr = typeof humidity === "number" ? `${humidity.toFixed(1)}%` : "N/A"
    const mqStr = typeof mq135 === "number" ? `${mq135.toFixed(0)} ppm` : "N/A"

    // Build the message body based on the type of alert
    let alertMessage: string

    if (decision === "TEST_ALERT") {
      alertMessage = [
        "✅ Test Alert — Smart Fruit Storage",
        "",
        "Your WhatsApp alerts are working correctly!",
        "",
        "💡 What would you like to do?",
        "1️⃣ SELL NOW (Stops fan immediately)",
        "2️⃣ SELL LATER (Run fans as usual)",
        "",
        "Reply with 'SELL NOW' (or '1') or 'SELL LATER' (or '2') to make a decision."
      ].join("\n")
    } else if (decision === "SELL_NOW") {
      alertMessage = [
        "📊 Market Decision: SELL NOW",
        "",
        "Market conditions are favorable for immediate sale. Fan stopped.",
        "",
        `Temperature: ${tempStr}`,
        `Humidity: ${humStr}`,
        `Air Quality (MQ135): ${mqStr}`,
      ].join("\n")
    } else if (decision === "SELL_LATER") {
      alertMessage = [
        "📊 Market Decision: SELL LATER",
        "",
        "Better prices expected later — maintaining storage conditions.",
        "",
        `Temperature: ${tempStr}`,
        `Humidity: ${humStr}`,
        `Air Quality (MQ135): ${mqStr}`,
      ].join("\n")
    } else {
      // Default: fan / spoilage alert with sensor readings
      alertMessage = [
        "🚨 SMART FRUIT STORAGE ALERT 🚨",
        "",
        "The storage unit fan has turned ON.",
        "",
        `ℹ️ Reason: ${reason || "Sensor threshold exceeded."}`,
        "",
        "📊 Current Metrics:",
        `- Temperature: ${tempStr}`,
        `- Humidity: ${humStr}`,
        `- Air Quality (MQ135): ${mqStr}`,
        "",
        "💡 What would you like to do?",
        "1️⃣ SELL NOW (Stops fan immediately)",
        "2️⃣ SELL LATER (Run fans as usual)",
        "",
        "Reply with 'SELL NOW' (or '1') or 'SELL LATER' (or '2') to make a decision."
      ].join("\n")
    }

    try {
      // 1. Try sending the rich freeform message (works if 24h WhatsApp session window is open)
      const msg = await client.messages.create({
        to: formattedToPhone,
        from: formattedFromPhone,
        body: alertMessage,
      })
      console.log(`[v0] Rich freeform WhatsApp alert sent: ${msg.sid} to ${toPhone}`)
      return NextResponse.json({
        ok: true,
        messageId: msg.sid,
        recipient: toPhone,
      })
    } catch (err: any) {
      // 2. Fall back to pre-approved template with buttons if freeform fails (session closed)
      console.warn(`[v0] Freeform send failed: ${err.message}. Falling back to pre-approved Sandbox template...`)
      
      const now = new Date(timestamp || Date.now())
      const dateStr = `${now.getMonth() + 1}/${now.getDate()}`
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      const var1 = typeof temperature === "number" ? `${temperature.toFixed(1)}°C` : dateStr
      const var2 = timeStr

      const msg = await client.messages.create({
        to: formattedToPhone,
        from: formattedFromPhone,
        contentSid: "HXb5b62575e6e4ff6129ad7c8efe1f983e",
        contentVariables: JSON.stringify({ "1": var1, "2": var2 })
      })

      console.log(`[v0] Sandbox template alert sent as fallback: ${msg.sid} to ${toPhone}`)
      return NextResponse.json({
        ok: true,
        messageId: msg.sid,
        recipient: toPhone,
        fallbackUsed: true,
      })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] Twilio error:", message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
