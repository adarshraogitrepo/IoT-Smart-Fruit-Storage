const FIREBASE_DB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL

export async function setMarketDecision(decision: {
  decision: string
  timestamp: number
  expiresAt: number
}) {
  if (!FIREBASE_DB_URL) {
    throw new Error("Firebase DB URL not configured")
  }

  const url = `${FIREBASE_DB_URL}/marketDecisions/latest.json`

  const response = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(decision),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Firebase error: ${error}`)
  }

  return response.json()
}

export async function getMarketDecision() {
  if (!FIREBASE_DB_URL) {
    throw new Error("Firebase DB URL not configured")
  }

  const url = `${FIREBASE_DB_URL}/marketDecisions/latest.json`

  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  })

  if (!response.ok) {
    throw new Error(`Firebase error: ${response.statusText}`)
  }

  const data = await response.json()
  return data
}
