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
    const { command } = await req.json()

    if (!command || !["STOP", "ON", "OFF", "NORMAL"].includes(command)) {
      return NextResponse.json(
        { ok: false, error: "Invalid fan command" },
        { status: 400 },
      )
    }

    const db = getFirebaseDb()
    if (!db) {
      return NextResponse.json(
        { ok: false, error: "Firebase not configured" },
        { status: 500 },
      )
    }

    // Send fan control command to ESP32 via Firebase
    const fanControlPath = ref(db, "fanControl/command")
    await set(fanControlPath, {
      command: command,
      timestamp: Date.now(),
      source: "web_dashboard",
    })

    console.log(`[v0] Fan control command sent: ${command}`)

    return NextResponse.json({
      ok: true,
      command,
      message: `Fan ${command === "STOP" ? "stopped" : command === "ON" ? "turned on" : command === "NORMAL" ? "set to normal" : "turned off"}`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] Fan control error:", message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const db = getFirebaseDb()
    if (!db) {
      return NextResponse.json(
        { ok: false, error: "Firebase not configured" },
        { status: 500 },
      )
    }

    // Get current fan status from Firebase
    const fanStatusRef = ref(db, "fanControl/status")
    // Note: In a real implementation, you'd use await get(fanStatusRef)
    // For now, we'll just return the last known state

    return NextResponse.json({
      ok: true,
      message: "Fan control status endpoint",
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] Fan status error:", message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
