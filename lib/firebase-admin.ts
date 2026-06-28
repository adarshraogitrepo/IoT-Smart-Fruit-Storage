import * as admin from "firebase-admin"

let adminApp: admin.app.App | null = null

function getServiceAccount(): admin.ServiceAccount {
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL

  if (!privateKey || !clientEmail) {
    throw new Error("Firebase Admin credentials not configured")
  }

  // Replace escaped newlines with actual newlines
  const key = privateKey.replace(/\\n/g, "\n")

  return {
    type: "service_account",
    project_id: "fruitfreshness",
    private_key_id: "42fcb52bc76cf89404dfa645176a8887191a11f6",
    private_key: key,
    client_email: clientEmail,
    client_id: "107288836426127376595",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url:
      "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url:
      "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40fruitfreshness.iam.gserviceaccount.com",
    universe_domain: "googleapis.com",
  } as unknown as admin.ServiceAccount
}

export function getAdminApp() {
  if (!adminApp) {
    try {
      const serviceAccount = getServiceAccount()
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      })
      console.log("[v0] Firebase Admin SDK initialized successfully")
    } catch (err) {
      console.error("[v0] Failed to initialize Firebase Admin:", err)
      throw err
    }
  }
  return adminApp
}

export function getAdminDb() {
  const app = getAdminApp()
  return admin.database(app)
}

export { admin }
