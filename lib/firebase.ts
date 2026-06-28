import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"
import { getDatabase, type Database } from "firebase/database"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
}

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.databaseURL,
)

let app: FirebaseApp | null = null
let db: Database | null = null

export function getFirebaseDb(): Database | null {
  if (!isFirebaseConfigured) return null
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig)
  }
  if (!db) {
    db = getDatabase(app)
  }
  return db
}
