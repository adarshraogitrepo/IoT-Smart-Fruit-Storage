#include <WiFi.h>
#include <Firebase_ESP_Client.h>

#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

#include <DHT.h>
#include <time.h>

// ---------------- WIFI ----------------
#define WIFI_SSID "w"
#define WIFI_PASSWORD "p"

// ------------- FIREBASE ---------------
#define API_KEY "AIzaSyDkWt-XMn1QOkkwvga024HE93qMbOj_mB8"
#define DATABASE_URL "https://fruitfreshness-default-rtdb.asia-southeast1.firebasedatabase.app"

// ---------------- DHT -----------------
#define DHTPIN 4
#define DHTTYPE DHT22

// --------------- MQ135 ----------------
#define MQ135_PIN 34

// --------------- RELAY ----------------
#define FAN_PIN 23

// ------------ THRESHOLDS --------------
#define TEMP_THRESHOLD 28.0
#define MQ_THRESHOLD 500

// ------------ SELL NOW TIMEOUT --------
#define SELL_NOW_TIMEOUT_MS 60000UL  // 60 seconds

DHT dht(DHTPIN, DHTTYPE);

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

bool signupOK = false;

unsigned long lastUpload = 0;
const unsigned long uploadInterval = 5000;

// ---------------- Fan Command ----------------
String fanCommand = "NORMAL";
unsigned long stopCommandTime = 0;   // millis() when STOP was first received
bool stopTimerActive = false;

// ---------------- WiFi ----------------
void connectWiFi()
{
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    Serial.print("Connecting");
    while (WiFi.status() != WL_CONNECTED)
    {
        Serial.print(".");
        delay(500);
    }

    Serial.println();
    Serial.println("WiFi Connected");
}

// ---------------- Time ----------------
void initTime()
{
    configTime(19800, 0, "pool.ntp.org");

    Serial.print("Waiting for NTP");
    while (time(nullptr) < 100000)
    {
        Serial.print(".");
        delay(500);
    }

    Serial.println();
    Serial.println("Time Synced");
}

void setup()
{
    Serial.begin(115200);

    pinMode(FAN_PIN, OUTPUT);
    digitalWrite(FAN_PIN, LOW);

    dht.begin();
    connectWiFi();
    initTime();

    config.api_key = API_KEY;
    config.database_url = DATABASE_URL;

    if (Firebase.signUp(&config, &auth, "", ""))
    {
        signupOK = true;
        Serial.println("Firebase SignUp OK");
    }
    else
    {
        Serial.println(config.signer.signupError.message.c_str());
    }

    config.token_status_callback = tokenStatusCallback;

    Firebase.begin(&config, &auth);
    Firebase.reconnectWiFi(true);

    Serial.println("Setup Complete");
}

// --------------------------------------------------
// Read Fan Command from Firebase
// --------------------------------------------------
void readFanCommand()
{
    if (!Firebase.ready() || !signupOK)
        return;

    if (Firebase.RTDB.getString(&fbdo, "/fanControl/command"))
    {
        String newCommand = fbdo.stringData();

        // If we just received a STOP command (wasn't STOP before), start the timer
        if ((newCommand == "STOP" || newCommand == "OFF") && !stopTimerActive)
        {
            stopTimerActive = true;
            stopCommandTime = millis();
            Serial.println("SELL NOW received - fan will stop for 60 seconds");
        }

        // If Firebase was reset to NORMAL externally, cancel the timer
        if (newCommand == "NORMAL" || newCommand == "ON")
        {
            stopTimerActive = false;
        }

        fanCommand = newCommand;
    }
}

// --------------------------------------------------
// Check if STOP timer has expired (60 seconds)
// --------------------------------------------------
void checkStopTimeout()
{
    if (!stopTimerActive)
        return;

    unsigned long elapsed = millis() - stopCommandTime;

    if (elapsed >= SELL_NOW_TIMEOUT_MS)
    {
        Serial.println("60s elapsed - reverting fan to NORMAL (automatic mode)");
        fanCommand = "NORMAL";
        stopTimerActive = false;

        // Write NORMAL back to Firebase so the dashboard reflects it
        if (Firebase.ready() && signupOK)
        {
            Firebase.RTDB.setString(&fbdo, "/fanControl/command", "NORMAL");
        }
    }
    else
    {
        // Print countdown every 10 seconds
        if ((elapsed % 10000) < 1000)
        {
            Serial.print("Fan stopped - auto-resume in ");
            Serial.print((SELL_NOW_TIMEOUT_MS - elapsed) / 1000);
            Serial.println("s");
        }
    }
}

// --------------------------------------------------
// Fan Logic
// --------------------------------------------------
bool determineFanState(float temp, int mq)
{
    // STOP override (from SELL NOW WhatsApp reply)
    if (fanCommand == "STOP" || fanCommand == "OFF")
        return false;

    // Manual ON override
    if (fanCommand == "ON")
        return true;

    // NORMAL - automatic sensor-based mode
    if (temp >= TEMP_THRESHOLD)
        return true;

    if (mq >= MQ_THRESHOLD)
        return true;

    return false;
}

// --------------------------------------------------
// Upload Sensor Data
// --------------------------------------------------
void uploadSensorData(float temp, float hum, int mq, bool fan)
{
    FirebaseJson json;
    struct tm timeinfo;
    char timestamp[30];

    if (getLocalTime(&timeinfo))
    {
        strftime(timestamp, sizeof(timestamp), "%Y-%m-%d %H:%M:%S", &timeinfo);
    }
    else
    {
        strcpy(timestamp, "NTP Error");
    }

    json.set("temperature", temp);
    json.set("humidity", hum);
    json.set("mq135", mq);
    json.set("fanStatus", fan);
    json.set("fanCommand", fanCommand);
    json.set("timestamp", timestamp);
    json.set("epoch", time(nullptr));

    // Latest reading
    Firebase.RTDB.setJSON(&fbdo, "/sensor", &json);

    // History
    Firebase.RTDB.pushJSON(&fbdo, "/sensorLogs", &json);
}

// =====================================================
// LOOP
// =====================================================
void loop()
{
    if (WiFi.status() != WL_CONNECTED)
    {
        Serial.println("WiFi Lost... Reconnecting");
        connectWiFi();
    }

    if (!Firebase.ready())
    {
        delay(100);
        return;
    }

    // Check if SELL NOW 60s timeout has expired
    checkStopTimeout();

    if (millis() - lastUpload >= uploadInterval)
    {
        lastUpload = millis();

        // Read latest command from Firebase
        readFanCommand();

        float temperature = dht.readTemperature();
        float humidity = dht.readHumidity();
        int mq135 = analogRead(MQ135_PIN);

        if (isnan(temperature) || isnan(humidity))
        {
            Serial.println("DHT Read Failed");
            return;
        }

        bool fan = determineFanState(temperature, mq135);

        digitalWrite(FAN_PIN, fan ? HIGH : LOW);

        Serial.println("-------------------------");
        Serial.print("Temperature : ");
        Serial.println(temperature);
        Serial.print("Humidity    : ");
        Serial.println(humidity);
        Serial.print("MQ135       : ");
        Serial.println(mq135);
        Serial.print("Command     : ");
        Serial.println(fanCommand);
        Serial.print("Fan         : ");
        Serial.println(fan ? "ON" : "OFF");
        if (stopTimerActive)
        {
            Serial.print("Auto-resume in: ");
            Serial.print((SELL_NOW_TIMEOUT_MS - (millis() - stopCommandTime)) / 1000);
            Serial.println("s");
        }

        uploadSensorData(temperature, humidity, mq135, fan);
    }

    delay(200);
}
