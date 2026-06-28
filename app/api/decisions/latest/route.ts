import { NextResponse } from "next/server"
import { initializeApp, getApps, getApp } from "firebase/app"
import { getDatabase, ref, get, set } from "firebase/database"

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

export async function GET() {
  try {
    const db = getFirebaseDb()

    if (!db) {
      return NextResponse.json(
        { ok: false, error: "Firebase not configured" },
        { status: 500 },
      )
    }

    const decisionRef = ref(db, "marketDecisions/latest")
    const snapshot = await get(decisionRef)

    if (snapshot.exists()) {
      const data = snapshot.val()

      // Check if decision has expired
      if (data.expiresAt && data.expiresAt < Date.now()) {
        return NextResponse.json({
          ok: true,
          decision: "NONE",
          expired: true,
          message: "Previous decision has expired",
        })
      }

      return NextResponse.json({
        ok: true,
        decision: data.decision || "NONE",
        temperature: data.temperature,
        humidity: data.humidity,
        mq135: data.mq135,
        fanSuggestion: data.fanSuggestion || 0,
        sentAt: data.sentAt,
        expiresAt: data.expiresAt,
        timeRemaining: data.expiresAt ? data.expiresAt - Date.now() : 0,
      })
    } else {
      return NextResponse.json({
        ok: true,
        decision: "NONE",
        message: "No market decision available yet",
      })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] Decisions API error:", message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { decision, temperature, humidity, mq135, fanSuggestion } = await req.json()

    if (!decision) {
      return NextResponse.json({ ok: false, error: "Missing decision" }, { status: 400 })
    }

    const db = getFirebaseDb()

    if (!db) {
      return NextResponse.json(
        { ok: false, error: "Firebase not configured" },
        { status: 500 },
      )
    }

    const expiresAt = Date.now() + 24 * 60 * 60 * 1000 // 24 hours

    const decisionData = {
      decision,
      temperature: temperature || null,
      humidity: humidity || null,
      mq135: mq135 || null,
      fanSuggestion: fanSuggestion || 0,
      sentAt: Date.now(),
      expiresAt,
    }

    await set(ref(db, "marketDecisions/latest"), decisionData)

    console.log(`[v0] Market decision created: ${decision}`)

    return NextResponse.json({
      ok: true,
      message: "Decision saved successfully",
      expiresAt,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] Decision creation error:", message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
