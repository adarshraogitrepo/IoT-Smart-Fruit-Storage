import { NextResponse } from "next/server"
import twilio from "twilio"

type Reading = {
  temperature?: number
  humidity?: number
  mq135?: number
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    // Accept either `phone` or `to` for the recipient.
    const phone: string | undefined = body.phone || body.to
    const message: string | undefined = body.message
    const decision: string | undefined = body.decision
    const reading: Reading | undefined = body.reading
    const { temperature, humidity, mq135 } = body as Reading

    if (!phone) {
      return NextResponse.json({ ok: false, error: "Missing phone number" }, { status: 400 })
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

    // Build the message body from whatever payload shape we received.
    let alertBody: string

    if (message) {
      // Freeform message (test alert / periodic status update).
      alertBody = message
    } else if (reading) {
      // Spoilage alert from useAlerts.
      alertBody = [
        "🚨 Smart Fruit Storage Alert",
        "",
        `Temperature: ${reading.temperature?.toFixed(1) ?? "N/A"}°C`,
        `Humidity: ${reading.humidity?.toFixed(0) ?? "N/A"}%`,
        `Air Quality (MQ135): ${reading.mq135 != null ? Math.round(reading.mq135) : "N/A"}`,
        "",
        "Potential fruit spoilage detected.",
        "Immediate inspection recommended.",
      ].join("\n")
    } else if (decision) {
      // Market decision alert.
      const decisionText =
        decision === "SELL_NOW"
          ? "🟢 SELL NOW — Conditions favorable for immediate sale"
          : decision === "SELL_LATER"
            ? "🔵 SELL LATER — Better prices expected, continue storage"
            : decision
      alertBody = [
        "📊 Market Decision Alert",
        "",
        decisionText,
        "",
        `Temperature: ${temperature?.toFixed?.(1) ?? "N/A"}°C`,
        `Humidity: ${humidity?.toFixed?.(0) ?? "N/A"}%`,
        `Air Quality: ${mq135?.toFixed?.(1) ?? "N/A"} ppm`,
      ].join("\n")
    } else {
      alertBody = "🔔 Smart Fruit Storage notification"
    }

    const client = twilio(sid, token)
    const fromAddr = from.startsWith("whatsapp:") ? from : `whatsapp:${from}`
    const toAddr = phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`

    // Guard: Twilio rejects messages where the recipient equals the sender (error 63031).
    if (toAddr.replace(/\s+/g, "") === fromAddr.replace(/\s+/g, "")) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "The alert recipient number is the same as the Twilio sender number. Enter YOUR personal WhatsApp number in Settings, not the Twilio sandbox number.",
        },
        { status: 400 },
      )
    }

    const now = new Date()
    const dateStr = `${now.getMonth() + 1}/${now.getDate()}`
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

    let var1 = dateStr
    if (reading) {
      const tempVal = reading.temperature != null ? `${reading.temperature.toFixed(1)}°C` : ""
      const humVal = reading.humidity != null ? `${reading.humidity.toFixed(0)}%` : ""
      if (tempVal && humVal) {
        var1 = `${tempVal}, ${humVal}`
      } else if (tempVal) {
        var1 = tempVal
      }
    }
    const var2 = timeStr

    const msgPayload: any = {
      from: fromAddr,
      to: toAddr,
    }

    const isPeriodicUpdate = message && message.includes("[Status Update]")

    if (!isPeriodicUpdate && (reading || message || decision)) {
      // Build descriptive warning body
      const tempSafe = reading?.temperature != null ? `${reading.temperature.toFixed(1)}°C` : "N/A"
      const humSafe = reading?.humidity != null ? `${reading.humidity.toFixed(0)}%` : "N/A"
      const aqSafe = reading?.mq135 != null ? `${Math.round(reading.mq135)} ppm` : "N/A"
      
      let reason = "Sensor readings exceeded safety thresholds."
      if (message) {
        // Extract offender description or use the message
        reason = message.split("\n\n")[1] || message
      }

      alertBody = [
        "🚨 SMART FRUIT STORAGE ALERT 🚨",
        "",
        `ℹ️ Warning: ${reason}`,
        "",
        "📊 Current Metrics:",
        `- Temperature: ${tempSafe}`,
        `- Humidity: ${humSafe}`,
        `- Air Quality: ${aqSafe}`,
        "",
        "💡 What would you like to do?",
        "1️⃣ SELL NOW (Stops fan immediately)",
        "2️⃣ SELL LATER (Run fans as usual)",
        "",
        "Reply with 'SELL NOW' (or '1') or 'SELL LATER' (or '2') to make a decision."
      ].join("\n")
    }

    try {
      // Attempt to send rich freeform message (or plain text for periodic updates)
      const msg = await client.messages.create({
        from: fromAddr,
        to: toAddr,
        body: alertBody,
      })
      console.log(`[v0] WhatsApp alert sent: ${msg.sid} to ${toAddr}`)
      return NextResponse.json({ ok: true, sid: msg.sid })
    } catch (err: any) {
      // Fallback to template if freeform fail (and it's not a periodic status update)
      if (!isPeriodicUpdate && (reading || message || decision)) {
        console.warn(`[v0] Freeform alert send failed: ${err.message}. Falling back to pre-approved Sandbox template...`)
        try {
          const msg = await client.messages.create({
            from: fromAddr,
            to: toAddr,
            contentSid: "HXb5b62575e6e4ff6129ad7c8efe1f983e",
            contentVariables: JSON.stringify({ "1": var1, "2": var2 })
          })
          console.log(`[v0] Sandbox template alert sent as fallback: ${msg.sid} to ${toAddr}`)
          return NextResponse.json({ ok: true, sid: msg.sid, fallbackUsed: true })
        } catch (templateErr: any) {
          console.error("[v0] Both freeform and template alerts failed:", templateErr)
          return NextResponse.json({ ok: false, error: templateErr.message }, { status: 500 })
        }
      } else {
        console.error("[v0] Text alert failed:", err)
        return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error sending alert"
    console.error("[v0] Alert error:", message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
