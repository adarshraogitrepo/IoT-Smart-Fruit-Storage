import { NextResponse } from "next/server"
import * as admin from "firebase-admin"

function getAdminDb() {
  if (admin.apps.length > 0) {
    return admin.app().database()
  }

  const serviceAccount = process.env.GCP_SERVICE_ACCOUNT
  const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL

  if (!serviceAccount || !databaseURL) {
    console.error("[v0] Missing Firebase Admin credentials")
    return null
  }

  try {
    const parsed = JSON.parse(serviceAccount)
    admin.initializeApp({
      credential: admin.credential.cert(parsed),
      databaseURL,
    })
    return admin.app().database()
  } catch (err) {
    console.error("[v0] Failed to init Firebase Admin:", err)
    return null
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const from = formData.get("From")?.toString() || ""
    const messageBody = formData.get("Body")?.toString().toUpperCase().trim() || ""

    console.log(`[v0] WhatsApp webhook received from ${from}: ${messageBody}`)

    const db = getAdminDb()

    if (!db) {
      const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Server configuration error. Please try again later.</Message></Response>`
      return new NextResponse(xml, { status: 500, headers: { "Content-Type": "text/xml" } })
    }

    // Check for SELL NOW / "1" response
    if (messageBody.includes("SELL NOW") || messageBody === "1" || messageBody.includes("SELL_NOW")) {
      console.log("[v0] SELL NOW detected - stopping fan immediately")

      await db.ref("fanControl/command").set("STOP")
      console.log("[v0] Fan command STOP sent to Firebase")

      await db.ref("marketDecisions/latest").set({
        decision: "SELL_NOW",
        timestamp: Date.now(),
        respondedBy: from,
      })

      await db.ref(`marketDecisions/history/${Date.now()}`).set({
        decision: "SELL_NOW",
        respondedBy: from,
        timestamp: Date.now(),
      })

      const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>✅ SELL NOW confirmed. Fan stopped immediately. The ESP32 will stop the fan shortly.</Message></Response>`
      return new NextResponse(xml, { status: 200, headers: { "Content-Type": "text/xml" } })
    }

    // Check for SELL LATER / "2" response
    if (messageBody.includes("SELL LATER") || messageBody === "2" || messageBody.includes("SELL_LATER")) {
      console.log("[v0] SELL LATER detected - continuing normal storage")

      await db.ref("fanControl/command").set("NORMAL")
      console.log("[v0] Fan command NORMAL sent to Firebase")

      await db.ref("marketDecisions/latest").set({
        decision: "SELL_LATER",
        timestamp: Date.now(),
        respondedBy: from,
      })

      await db.ref(`marketDecisions/history/${Date.now()}`).set({
        decision: "SELL_LATER",
        respondedBy: from,
        timestamp: Date.now(),
      })

      const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>✅ SELL LATER confirmed. Fans will continue running as usual to maintain optimal storage conditions.</Message></Response>`
      return new NextResponse(xml, { status: 200, headers: { "Content-Type": "text/xml" } })
    }

    // Unknown message
    const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Reply with:\n1️⃣ SELL NOW - to stop the fan immediately\n2️⃣ SELL LATER - to continue normal storage</Message></Response>`
    return new NextResponse(xml, { status: 200, headers: { "Content-Type": "text/xml" } })

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] Webhook error:", message)
    const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Error: ${message}</Message></Response>`
    return new NextResponse(xml, { status: 500, headers: { "Content-Type": "text/xml" } })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "WhatsApp webhook active" })
}
