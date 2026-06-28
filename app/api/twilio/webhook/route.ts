import { NextResponse } from "next/server"
import twilio from "twilio"
import { ref, set } from "firebase/database"
import { getFirebaseDb } from "@/lib/firebase"

export async function POST(req: Request) {
  try {
    const data = await req.formData()
    const body = data.get("Body") as string
    const from = data.get("From") as string

    console.log(`[v0] WhatsApp webhook received from ${from}: ${body}`)

    // Parse the button response
    let decision = "NONE"
    let fanCommand = "NORMAL"
    if (body?.toLowerCase().includes("sell now") || body?.toLowerCase().includes("confirm")) {
      decision = "SELL_NOW"
      fanCommand = "STOP"
    } else if (body?.toLowerCase().includes("sell later") || body?.toLowerCase().includes("cancel")) {
      decision = "SELL_LATER"
      fanCommand = "NORMAL"
    }

    if (decision !== "NONE") {
      // Save decision to Firebase
      const db = getFirebaseDb()
      if (db) {
        // Update fanControl command
        await set(ref(db, "fanControl/command"), fanCommand)
        console.log(`[v0] Fan command ${fanCommand} sent to Firebase`)

        const expiresAt = Date.now() + 24 * 60 * 60 * 1000 // 24 hours
        const decisionData = {
          decision,
          temperature: null,
          humidity: null,
          mq135: null,
          fanSuggestion: decision === "SELL_NOW" ? 1 : 0,
          phone: from,
          sentAt: Date.now(),
          expiresAt,
        }

        await set(ref(db, "marketDecisions/latest"), decisionData)
        console.log(`[v0] Market decision saved to Firebase: ${decision}`)

        const confirmationMsg = decision === "SELL_NOW"
          ? "✅ SELL NOW confirmed. Fan stopped immediately."
          : "✅ SELL LATER confirmed. Continuing optimal storage."

        const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>${confirmationMsg}</Message>
</Response>`

        return new NextResponse(xmlResponse, {
          status: 200,
          headers: { "Content-Type": "text/xml" }
        })
      }
    }

    // Return 200 OK to Twilio
    return new NextResponse("", { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] Webhook error:", message)
    return new NextResponse("", { status: 500 })
  }
}
