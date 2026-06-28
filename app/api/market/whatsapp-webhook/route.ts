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
    console.error("[v0] Missing Firebase config env vars on Vercel")
    return null
  }
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
  return getDatabase(app)
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const from = formData.get("From")?.toString() || ""
    const messageBody = formData.get("Body")?.toString().toUpperCase().trim() || ""

    console.log(`[v0] WhatsApp webhook received from ${from}: "${messageBody}"`)

    const db = getFirebaseDb()

    if (!db) {
      const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Server config error. Firebase not connected.</Message></Response>`
      return new NextResponse(xml, { status: 500, headers: { "Content-Type": "text/xml" } })
    }

    const expiresAt = Date.now() + 24 * 60 * 60 * 1000 // 24 hours

    // SELL NOW / reply "1"
    if (messageBody.includes("SELL NOW") || messageBody === "1" || messageBody.includes("SELL_NOW")) {
      console.log("[v0] SELL NOW detected - writing STOP to Firebase")

      await set(ref(db, "fanControl/command"), "STOP")
      await set(ref(db, "marketDecisions/latest"), {
        decision: "SELL_NOW",
        temperature: null,
        humidity: null,
        mq135: null,
        fanSuggestion: 1,
        phone: from,
        sentAt: Date.now(),
        expiresAt,
      })

      console.log("[v0] STOP command written to Firebase successfully")

      const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>✅ SELL NOW confirmed. Fan stopped immediately.</Message></Response>`
      return new NextResponse(xml, { status: 200, headers: { "Content-Type": "text/xml" } })
    }

    // SELL LATER / reply "2"
    if (messageBody.includes("SELL LATER") || messageBody === "2" || messageBody.includes("SELL_LATER")) {
      console.log("[v0] SELL LATER detected - writing NORMAL to Firebase")

      await set(ref(db, "fanControl/command"), "NORMAL")
      await set(ref(db, "marketDecisions/latest"), {
        decision: "SELL_LATER",
        temperature: null,
        humidity: null,
        mq135: null,
        fanSuggestion: 0,
        phone: from,
        sentAt: Date.now(),
        expiresAt,
      })

      console.log("[v0] NORMAL command written to Firebase successfully")

      const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>✅ SELL LATER confirmed. Continuing optimal storage.</Message></Response>`
      return new NextResponse(xml, { status: 200, headers: { "Content-Type": "text/xml" } })
    }

    // Unknown message
    console.log(`[v0] Unknown message: "${messageBody}" - sending help`)
    const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Reply with:\n1 or SELL NOW - stop the fan immediately\n2 or SELL LATER - continue normal storage</Message></Response>`
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
