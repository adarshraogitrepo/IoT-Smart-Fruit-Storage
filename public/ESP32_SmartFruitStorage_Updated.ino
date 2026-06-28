#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>
#include "DHT.h"
#include <time.h>

// WiFi credentials
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// Firebase Project API Key
#define API_KEY "YOUR_FIREBASE_API_KEY"
#define DATABASE_URL "YOUR_FIREBASE_DATABASE_URL"

// DHT sensor setup
#define DHT_PIN 4
#define DHT_TYPE DHT22
DHT dht(DHT_PIN, DHT_TYPE);

// MQ135 sensor on analog input
#define MQ135_PIN 34

// Fan relay setup
#define FAN_PIN 2

// Global Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
unsigned long sendDataPrevMillis = 0;

// Market decision struct
struct MarketDecision {
  String decision;     // "SELL_NOW", "SELL_LATER", "NONE"
  int fanSuggestion;   // 1 = ON, 0 = OFF
  unsigned long expiresAt;
};

MarketDecision currentDecision = {"NONE", 0, 0};

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n\nSmart Fruit Storage ESP32 - Starting Up...");
  
  // Setup pins
  pinMode(FAN_PIN, OUTPUT);
  digitalWrite(FAN_PIN, LOW);
  
  // Setup DHT sensor
  dht.begin();
  
  // Connect to WiFi
  connectToWiFi();
  
  // Configure Firebase
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  
  auth.user.email = "";
  auth.user.password = "";
  
  config.token_status_callback = tokenStatusCallback;
  
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  
  // Set Firebase stream callback
  if (!Firebase.RTDB.beginStream(&fbdo, "/marketDecisions")) {
    Serial.println("Failed to begin stream for market decisions");
  }
  Firebase.RTDB.setStreamCallback(&fbdo, streamCallback, streamTimeoutCallback);
  
  Serial.println("Setup complete!");
}

void loop() {
  // Check Firebase connection
  if (Firebase.ready() && (millis() - sendDataPrevMillis > 5000 || sendDataPrevMillis == 0)) {
    sendDataPrevMillis = millis();
    
    // Read sensor values
    float temp = dht.readTemperature();
    float humidity = dht.readHumidity();
    int mq135 = analogRead(MQ135_PIN);
    
    // Convert MQ135 analog to ppm (calibration may be needed)
    float mq135_ppm = map(mq135, 0, 4095, 0, 500) / 10.0;
    
    // Check if readings are valid
    if (!isnan(temp) && !isnan(humidity)) {
      Serial.printf("Temp: %.1f°C, Humidity: %.0f%%, MQ135: %.1f ppm\n", temp, humidity, mq135_ppm);
      
      // Determine fan state based on market decision and thresholds
      int fanState = determineFanState(temp, humidity, mq135_ppm);
      
      // Control fan
      digitalWrite(FAN_PIN, fanState ? HIGH : LOW);
      Serial.printf("Fan: %s (Decision: %s)\n", fanState ? "ON" : "OFF", currentDecision.decision.c_str());
      
      // Upload sensor data with decision to Firebase
      FirebaseJson json;
      json.set("temperature", temp);
      json.set("humidity", humidity);
      json.set("mq135", mq135_ppm);
      json.set("fanStatus", fanState ? "ON" : "OFF");
      json.set("marketDecision", currentDecision.decision);
      json.set("timestamp", millis());
      
      if (Firebase.RTDB.setJSON(&fbdo, "/sensor", &json)) {
        Serial.println("Sensor data uploaded successfully");
      } else {
        Serial.printf("Failed to upload sensor data: %s\n", fbdo.errorReason().c_str());
      }
    } else {
      Serial.println("Failed to read DHT sensor");
    }
  }
  
  // Keep Firebase stream alive
  if (!Firebase.RTDB.readStream(&fbdo)) {
    Serial.printf("Stream read error: %s\n", fbdo.errorReason().c_str());
  }
  
  delay(100);
}

// Connect to WiFi
void connectToWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi: ");
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\nWiFi connected! IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\nFailed to connect to WiFi");
  }
}

// Firebase stream callback - receives market decisions
void streamCallback(FirebaseStream data) {
  if (data.dataType() == fb_esp_rtdb_data_type_json) {
    FirebaseJson json = *data.jsonObjectPtr();
    
    String decision = json.isValid() ? json.getString("decision") : "NONE";
    int fanSuggestion = json.isValid() ? json.getInt("fanSuggestion") : 0;
    unsigned long expiresAt = json.isValid() ? json.getInt("expiresAt") : 0;
    
    // Check if decision has expired
    if (expiresAt > millis()) {
      currentDecision.decision = decision;
      currentDecision.fanSuggestion = fanSuggestion;
      currentDecision.expiresAt = expiresAt;
      Serial.printf("Market Decision Updated: %s (Expires: %lu ms)\n", decision.c_str(), expiresAt - millis());
    } else {
      currentDecision.decision = "NONE";
      currentDecision.fanSuggestion = 0;
      Serial.println("Market Decision Expired");
    }
  }
}

void streamTimeoutCallback(bool timeout) {
  if (timeout) {
    Serial.println("Stream timeout, resuming...\n");
  }
}

void tokenStatusCallback(token_info_t info) {
  if (info.status == token_status_ready) {
    Serial.println("\nGot Sensor API access token");
  }
}

// Determine fan state based on thresholds and market decision
int determineFanState(float temp, float humidity, float mq135) {
  // SELL_NOW: Always turn on fan to preserve fruit
  if (currentDecision.decision == "SELL_NOW") {
    return 1;
  }
  
  // SELL_LATER: Use normal thresholds but be more aggressive
  if (currentDecision.decision == "SELL_LATER") {
    // More aggressive threshold when selling later
    if (temp > 28 || humidity > 80 || mq135 > 100) {
      return 1;
    }
  }
  
  // NONE or default thresholds
  // Turn on fan if conditions deteriorate
  if (temp > 30 || humidity > 85 || mq135 > 150) {
    return 1;
  }
  
  // Turn off if conditions improve
  if (temp < 25 && humidity < 70 && mq135 < 80) {
    return 0;
  }
  
  // Default: use current fan state (hysteresis)
  return digitalRead(FAN_PIN);
}
