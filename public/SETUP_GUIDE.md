# Smart Fruit Storage - WhatsApp Integration Setup Guide

## 1. Firebase Configuration

### Market Decisions Schema
Add this to your Firebase Realtime Database at `/marketDecisions`:

```json
{
  "marketDecisions": {
    "latest": {
      "decision": "SELL_NOW",
      "temperature": 27.0,
      "humidity": 73.4,
      "mq135": 32.0,
      "fanSuggestion": 1,
      "sentAt": 1686591234000,
      "expiresAt": 1686677634000
    }
  }
}
```

**Field Descriptions:**
- `decision`: "SELL_NOW" | "SELL_LATER" | "NONE"
- `fanSuggestion`: 1 (turn ON) or 0 (turn OFF)
- `expiresAt`: Unix timestamp when decision expires (auto-remove after 24 hours)
- `temperature`, `humidity`, `mq135`: Sensor readings at decision time

### Firebase Rules
Update your Firebase Realtime Database Rules to enable read/write:

```json
{
  "rules": {
    "sensor": {
      ".read": true,
      ".write": true
    },
    "marketDecisions": {
      ".read": true,
      ".write": "root.auth.uid != null"
    }
  }
}
```

---

## 2. Twilio Setup

### Create Twilio Account
1. Go to https://www.twilio.com/console
2. Sign up for a free Twilio account
3. Get your:
   - **Account SID** (from dashboard)
   - **Auth Token** (from dashboard)

### Enable WhatsApp
1. Go to **Messaging** → **Channels** → **WhatsApp**
2. Complete the WhatsApp Business Account setup
3. Get your **WhatsApp-enabled phone number** (e.g., `+14155552671`)

### Environment Variables
Add these to your `.env.production` or Vercel project settings:

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_FROM=+14155552671
```

---

## 3. ESP32 Configuration

### Update Arduino Sketch
Edit `ESP32_SmartFruitStorage_Updated.ino` and replace:

```cpp
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define API_KEY "YOUR_FIREBASE_API_KEY"
#define DATABASE_URL "YOUR_FIREBASE_DATABASE_URL"
```

### Sensor Calibration
- **MQ135 Sensor**: Adjust the ppm mapping in `determineFanState()` based on your calibration
- **DHT22 Sensor**: Verify temperature/humidity readings are accurate
- **Fan Relay**: Ensure pin 2 is connected to your relay module

### Upload to ESP32
1. Open Arduino IDE
2. Select **Tools** → **Board** → **ESP32-WROOM-32**
3. Select your COM port
4. Click Upload

---

## 4. API Endpoints

Your Next.js application exposes these endpoints:

### Send WhatsApp Alert
**POST** `/api/alerts/send`
```json
{
  "phone": "+1234567890",
  "decision": "SELL_NOW",
  "temperature": 27.0,
  "humidity": 73.4,
  "mq135": 32.0
}
```

### Get Latest Decision
**GET** `/api/decisions/latest`
```json
{
  "decision": "SELL_NOW",
  "temperature": 27.0,
  "humidity": 73.4,
  "mq135": 32.0,
  "fanSuggestion": 1,
  "expiresAt": 1686677634000
}
```

### Twilio Webhook
**POST** `/api/twilio/webhook`
Handles incoming WhatsApp button clicks automatically.

---

## 5. Testing Workflow

### 1. Test Firebase Connection
- Check dashboard shows live sensor data
- Verify `/sensor` path updates every 5 seconds

### 2. Send Test Alert
```bash
curl -X POST http://localhost:3000/api/alerts/send \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+1234567890",
    "decision": "SELL_NOW",
    "temperature": 27.0,
    "humidity": 73.4,
    "mq135": 32.0
  }'
```

### 3. Test Decision Reading
- Manually add market decision to `/marketDecisions/latest` in Firebase
- Check ESP32 serial output for: "Market Decision Updated"
- Verify fan turns ON/OFF based on decision

### 4. WhatsApp Button Test
- Send alert with buttons
- Click "Sell Now" or "Sell Later" on WhatsApp
- Verify decision appears in Firebase and dashboard

---

## 6. Troubleshooting

### ESP32 Not Connecting to Firebase
- Check WiFi credentials
- Verify Firebase API key and database URL
- Check Firebase rules allow anonymous writes to `/sensor`

### WhatsApp Not Receiving Messages
- Verify Twilio phone number is WhatsApp-enabled
- Check TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM are correct
- Test with Twilio console first

### Fan Not Responding to Decisions
- Check `/marketDecisions/latest` has valid data
- Verify ESP32 serial output shows "Market Decision Updated"
- Check `expiresAt` timestamp is in the future

---

## 7. Production Deployment

1. Add environment variables to Vercel:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_DATABASE_URL`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_WHATSAPP_FROM`

2. Update Twilio webhook URL in Vercel settings:
   - Go to Twilio Console
   - Set **Webhook URL** to: `https://your-vercel-app.vercel.app/api/twilio/webhook`

3. Deploy to Vercel:
   ```bash
   git push origin main
   ```
