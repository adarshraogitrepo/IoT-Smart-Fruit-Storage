import { NextResponse } from "next/server"
import { initializeApp, getApps, getApp } from "firebase/app"
import { getDatabase, ref, set } from "firebase/database"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
}

function getFirebaseDb() {
  if (!firebaseConfig.apiKey || !firebaseConfig.databaseURL) {
    return null
  }
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
  return getDatabase(app)
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const from = formData.get("From")?.toString() || ""
    const messageBody = formData.get("Body")?.toString().toUpperCase() || ""

    console.log(`[v0] WhatsApp webhook received from ${from}: ${messageBody}`)

    // Check for SELL_NOW, "1", or "CONFIRM" response (Option 1)
    if (messageBody.includes("SELL_NOW") || messageBody === "1" || messageBody.includes("CONFIRM")) {
      console.log("[v0] SELL NOW / CONFIRM detected - stopping fan immediately")

      // Write fan command to Firebase for ESP32 to read
      const db = getFirebaseDb()
      if (db) {
        await set(ref(db, "fanControl/command"), "STOP")
        console.log("[v0] Fan command STOP sent to Firebase")
      }

      // Also save the decision
      await set(ref(db, "marketDecisions/latest"), {
        decision: "SELL_NOW",
        timestamp: Date.now(),
        respondedBy: from,
      })
      // Also store in history for audit
      await set(ref(db, `marketDecisions/history/${Date.now()}`), {
        decision: "SELL_NOW",
        respondedBy: from,
        timestamp: Date.now(),
      })

      const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>✅ SELL NOW confirmed. Fan stopped immediately.</Message>
</Response>`
      return new NextResponse(xmlResponse, {
        status: 200,
        headers: { "Content-Type": "text/xml" }
      })
    }

    // Check for SELL_LATER, "2", or "CANCEL" response (Option 2)
    if (messageBody.includes("SELL_LATER") || messageBody === "2" || messageBody.includes("CANCEL")) {
      console.log("[v0] SELL LATER / CANCEL detected - continuing storage")

      // Write fan command to Firebase for ESP32 to read
      const db = getFirebaseDb()
      if (db) {
        await set(ref(db, "fanControl/command"), "NORMAL")
        console.log("[v0] Fan command NORMAL sent to Firebase")
      }

      // Also save the decision
      await set(ref(db, "marketDecisions/latest"), {
        decision: "SELL_LATER",
        timestamp: Date.now(),
        respondedBy: from,
      })
      // Also store in history for audit
      await set(ref(db, `marketDecisions/history/${Date.now()}`), {
        decision: "SELL_LATER",
        respondedBy: from,
        timestamp: Date.now(),
      })

      const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>✅ SELL LATER confirmed. Continuing optimal storage.</Message>
</Response>`
      return new NextResponse(xmlResponse, {
        status: 200,
        headers: { "Content-Type": "text/xml" }
      })
    }

    const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>Message received. Reply with SELL NOW (1) or SELL LATER (2)</Message>
</Response>`
    return new NextResponse(xmlResponse, {
      status: 200,
      headers: { "Content-Type": "text/xml" }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] Webhook error:", message)
    const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>Error processing your request: ${message}</Message>
</Response>`
    return new NextResponse(xmlResponse, {
      status: 500,
      headers: { "Content-Type": "text/xml" }
    })
  }
}

export async function GET(req: Request) {
  // Twilio webhook verification
  const { searchParams } = new URL(req.url)
  const hubChallenge = searchParams.get("hub.challenge")

  if (hubChallenge) {
    return NextResponse.json({ ok: true, challenge: hubChallenge })
  }

  return NextResponse.json({ ok: true })
}
