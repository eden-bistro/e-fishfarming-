#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <RTClib.h>
#include <Wire.h>
#include <time.h>
#include <math.h>
#include "secrets.h"

// Backward-compatible fallbacks for older secrets.h files.
// Prefer explicit FARM_ID and POND_ID values in secrets.h.
#ifndef FARM_ID
#ifdef FARMER_ID
#define FARM_ID FARMER_ID
#else
#define FARM_ID "default"
#endif
#endif

#ifndef POND_ID
#ifdef CAGE_ID
#define POND_ID CAGE_ID
#else
#define POND_ID "default"
#endif
#endif

// =========================
// HARDWARE PINS
// =========================
#define ONEWIRE_PIN 15
#define PH_PIN 34
#define DO_PIN 35
#define NH3_PIN 32
#define MOTOR_IN1 18
#define MOTOR_IN2 19

// =========================
// OBJECTS
// =========================
OneWire oneWire(ONEWIRE_PIN);
DallasTemperature ds18b20(&oneWire);
RTC_DS3231 rtc;
WiFiClientSecure secureClient;
Preferences prefs;

// =========================
// STATE
// =========================
bool rtcOk = false;
float tempC = 0.0f;
float phValue = 7.0f;
float doValue = 5.0f;
float nh3Value = 0.01f;
uint32_t sampleCounter = 0;

// =========================
// TIMERS
// =========================
unsigned long lastSensorReadMs = 0;
unsigned long lastBackendUploadMs = 0;
unsigned long lastStatusPrintMs = 0;
unsigned long lastWifiCheckMs = 0;
unsigned long lastNtpSyncMs = 0;

// =========================
// INTERVALS
// =========================
const unsigned long SENSOR_READ_INTERVAL_MS = 1000;
const unsigned long BACKEND_UPLOAD_INTERVAL_MS = 10000;
const unsigned long STATUS_PRINT_INTERVAL_MS = 10000;
const unsigned long WIFI_RECONNECT_INTERVAL_MS = 15000;
const unsigned long NTP_SYNC_INTERVAL_MS = 3600000;

// =========================
// WATER LIMITS
// =========================
float TEMP_MIN = 22.0f;
float TEMP_MAX = 32.0f;
float PH_MIN = 6.5f;
float PH_MAX = 8.5f;
float DO_MIN = 4.0f;
float NH3_MAX = 0.05f;

// =========================
// QUEUE
// =========================
const uint16_t QUEUE_CAPACITY = 40;
uint16_t qHead = 0;
uint16_t qTail = 0;
uint16_t qSize = 0;

// =========================
// QUEUE HELPERS
// =========================
String keyForIndex(uint16_t idx) {
  return "q_" + String(idx);
}

void saveQueueMeta() {
  prefs.putUShort("qHead", qHead);
  prefs.putUShort("qTail", qTail);
  prefs.putUShort("qSize", qSize);
}

void resetQueue() {
  prefs.clear();
  qHead = 0;
  qTail = 0;
  qSize = 0;
  saveQueueMeta();
  Serial.println("Queue cleared");
}

void loadQueueMeta() {
  qHead = prefs.getUShort("qHead", 0);
  qTail = prefs.getUShort("qTail", 0);
  qSize = prefs.getUShort("qSize", 0);

  if (qHead >= QUEUE_CAPACITY || qTail >= QUEUE_CAPACITY || qSize > QUEUE_CAPACITY) {
    resetQueue();
  }
}

bool queuePush(const String &payload) {
  if (qSize == QUEUE_CAPACITY) {
    prefs.remove(keyForIndex(qHead).c_str());
    qHead = (qHead + 1) % QUEUE_CAPACITY;
    qSize--;
  }

  prefs.putString(keyForIndex(qTail).c_str(), payload);
  qTail = (qTail + 1) % QUEUE_CAPACITY;
  qSize++;
  saveQueueMeta();
  return true;
}

bool queuePeek(String &payload) {
  if (qSize == 0) return false;
  payload = prefs.getString(keyForIndex(qHead).c_str(), "");
  return payload.length() > 0;
}

bool queuePop() {
  if (qSize == 0) return false;

  prefs.remove(keyForIndex(qHead).c_str());
  qHead = (qHead + 1) % QUEUE_CAPACITY;
  qSize--;
  saveQueueMeta();
  return true;
}

// =========================
// HELPERS
// =========================
float smooth(float incoming, float previous) {
  return (0.7f * previous) + (0.3f * incoming);
}

bool finiteNum(float v) {
  return !isnan(v) && isfinite(v);
}

DateTime getNow() {
  if (rtcOk) return rtc.now();

  time_t now;
  time(&now);
  if (now > 1700000000) return DateTime(now);

  return DateTime(2026, 1, 1, 0, 0, 0);
}

String isoNow() {
  DateTime dt = getNow();
  char buf[32];

  snprintf(
    buf,
    sizeof(buf),
    "%04d-%02d-%02dT%02d:%02d:%02d.000Z",
    dt.year(),
    dt.month(),
    dt.day(),
    dt.hour(),
    dt.minute(),
    dt.second()
  );

  return String(buf);
}

// =========================
// WIFI
// =========================
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.println();
  Serial.println("=================================");
  Serial.println("Starting WiFi connection...");
  Serial.println("=================================");

  WiFi.disconnect(true, true);
  delay(1000);
  WiFi.mode(WIFI_STA);
  delay(500);
  WiFi.setSleep(false);

  Serial.print("SSID: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startAttempt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < 20000) {
    Serial.print(".");
    delay(500);

    wl_status_t status = WiFi.status();
    if (status == WL_CONNECT_FAILED) {
      Serial.println("\nWiFi auth failed");
      break;
    }
    if (status == WL_NO_SSID_AVAIL) {
      Serial.println("\nSSID not found");
      break;
    }
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("=================================");
    Serial.println("WiFi CONNECTED");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("RSSI: ");
    Serial.println(WiFi.RSSI());
    Serial.println("=================================");
  } else {
    Serial.println("=================================");
    Serial.print("WiFi FAILED. Status code: ");
    Serial.println(WiFi.status());
    Serial.println("Possible causes:");
    Serial.println("1. Wrong password");
    Serial.println("2. 5GHz WiFi (ESP32 only supports 2.4GHz)");
    Serial.println("3. Weak signal");
    Serial.println("4. Hidden SSID");
    Serial.println("5. Router MAC filtering");
    Serial.println("=================================");
  }
}

// =========================
// NTP
// =========================
void syncTimeWithNTP() {
  if (WiFi.status() != WL_CONNECTED) return;

  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  struct tm timeinfo;

  if (getLocalTime(&timeinfo)) {
    if (rtcOk) {
      rtc.adjust(DateTime(
        timeinfo.tm_year + 1900,
        timeinfo.tm_mon + 1,
        timeinfo.tm_mday,
        timeinfo.tm_hour,
        timeinfo.tm_min,
        timeinfo.tm_sec
      ));
    }
    Serial.println("NTP sync OK");
  } else {
    Serial.println("NTP sync failed");
  }
}

// =========================
// SENSORS
// =========================
void readSensors() {
  ds18b20.requestTemperatures();
  float t = ds18b20.getTempCByIndex(0);

  if (t != DEVICE_DISCONNECTED_C && t > -20 && t < 80) {
    tempC = smooth(t, tempC);
  }

  float phRaw = analogRead(PH_PIN);
  float doRaw = analogRead(DO_PIN);
  float nh3Raw = analogRead(NH3_PIN);

  float phCalc = phRaw * (14.0f / 4095.0f);
  float doCalc = doRaw * (20.0f / 4095.0f);
  float nh3Calc = nh3Raw * (10.0f / 4095.0f);

  phValue = smooth(phCalc, phValue);
  doValue = smooth(doCalc, doValue);
  nh3Value = smooth(nh3Calc, nh3Value);
}

bool isWaterSafe() {
  if (doValue < DO_MIN) return false;
  if (nh3Value > NH3_MAX) return false;
  if (tempC < TEMP_MIN || tempC > TEMP_MAX) return false;
  if (phValue < PH_MIN || phValue > PH_MAX) return false;
  return true;
}

// =========================
// PAYLOAD
// =========================
String buildPayload() {
  StaticJsonDocument<768> doc;

  // These exact keys are required by POST /api/iot/ingest.
  doc["deviceId"] = DEVICE_ID;
  doc["farmId"] = FARM_ID;
  doc["pondId"] = POND_ID;
  doc["firmware"] = FIRMWARE_VERSION;

#ifdef FARMER_ID
  doc["farmerId"] = FARMER_ID;
#endif
#ifdef CAGE_ID
  doc["cageId"] = CAGE_ID;
#endif

  if (finiteNum(tempC)) doc["temperature"] = tempC;
  if (finiteNum(phValue)) doc["ph"] = phValue;
  if (finiteNum(doValue)) doc["dissolvedOxygen"] = doValue;
  if (finiteNum(nh3Value)) doc["ammonia"] = nh3Value;

  doc["nitrite"] = 0;
  doc["timestamp"] = isoNow();
  doc["waterSafe"] = isWaterSafe();
  doc["rssi"] = WiFi.RSSI();
  doc["uptimeMs"] = millis();
  doc["freeHeap"] = ESP.getFreeHeap();
  doc["readingId"] = String(DEVICE_ID) + "_" + String((unsigned long)time(nullptr)) + "_" + String(sampleCounter++);

  String body;
  serializeJson(doc, body);
  return body;
}

// =========================
// BACKEND
// =========================
bool postPayload(const String &body) {
  if (WiFi.status() != WL_CONNECTED) return false;

  secureClient.setTimeout(15);

#ifdef TLS_ALLOW_INSECURE
  if (TLS_ALLOW_INSECURE) {
    secureClient.setInsecure();
  } else {
    secureClient.setCACert(TLS_ROOT_CA);
  }
#else
  secureClient.setCACert(TLS_ROOT_CA);
#endif

  HTTPClient http;
  http.setTimeout(15000);

  if (!http.begin(secureClient, BACKEND_INGEST_URL)) {
    Serial.println("HTTP begin failed");
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + IOT_INGEST_TOKEN);
  http.addHeader("Connection", "close");

  Serial.print("POST body=");
  Serial.println(body);

  int code = http.POST(body);
  String resp = http.getString();
  http.end();

  if (code >= 200 && code < 300) {
    Serial.printf("Backend ingest OK code=%d resp=%s\n", code, resp.c_str());
    return true;
  }

  Serial.printf("Backend ingest FAIL code=%d resp=%s\n", code, resp.c_str());
  return false;
}

void flushQueueWithBackoff() {
  if (WiFi.status() != WL_CONNECTED || qSize == 0) return;

  uint8_t attempts = 0;
  while (qSize > 0 && attempts < 5) {
    String payload;
    if (!queuePeek(payload)) break;

    if (postPayload(payload)) {
      queuePop();
      attempts = 0;
    } else {
      attempts++;
      unsigned long waitMs = 500UL * (1UL << attempts);
      if (waitMs > 8000) waitMs = 8000;
      delay(waitMs);
    }
  }
}

void captureAndSend() {
  String payload = buildPayload();

  if (!postPayload(payload)) {
    queuePush(payload);
  }

  flushQueueWithBackoff();
}

// =========================
// SETUP
// =========================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("BOOTING ESP32...");
  Serial.println();

  pinMode(MOTOR_IN1, OUTPUT);
  pinMode(MOTOR_IN2, OUTPUT);
  digitalWrite(MOTOR_IN1, LOW);
  digitalWrite(MOTOR_IN2, LOW);

  analogReadResolution(12);
  ds18b20.begin();
  Wire.begin(21, 22);
  rtcOk = rtc.begin();

  prefs.begin("aqua", false);

#ifdef CLEAR_QUEUE_ON_BOOT
  if (CLEAR_QUEUE_ON_BOOT) {
    resetQueue();
  }
#endif

  loadQueueMeta();

  WiFi.persistent(false);
  connectWiFi();
  syncTimeWithNTP();
  lastNtpSyncMs = millis();

  Serial.println("System ready");
}

// =========================
// LOOP
// =========================
void loop() {
  unsigned long nowMs = millis();

  if (WiFi.status() != WL_CONNECTED && nowMs - lastWifiCheckMs >= WIFI_RECONNECT_INTERVAL_MS) {
    Serial.println("WiFi disconnected. Reconnecting...");
    connectWiFi();
    lastWifiCheckMs = nowMs;
  }

  if (nowMs - lastSensorReadMs >= SENSOR_READ_INTERVAL_MS) {
    readSensors();
    lastSensorReadMs = nowMs;
  }

  if (nowMs - lastBackendUploadMs >= BACKEND_UPLOAD_INTERVAL_MS) {
    captureAndSend();
    lastBackendUploadMs = nowMs;
  }

  if (nowMs - lastNtpSyncMs >= NTP_SYNC_INTERVAL_MS) {
    syncTimeWithNTP();
    lastNtpSyncMs = nowMs;
  }

  if (nowMs - lastStatusPrintMs >= STATUS_PRINT_INTERVAL_MS) {
    lastStatusPrintMs = nowMs;
    Serial.printf(
      "[STATUS] T=%.2f pH=%.2f DO=%.2f NH3=%.4f WiFi=%s RSSI=%d Queue=%u Heap=%u\n",
      tempC,
      phValue,
      doValue,
      nh3Value,
      WiFi.status() == WL_CONNECTED ? "OK" : "DOWN",
      WiFi.RSSI(),
      qSize,
      ESP.getFreeHeap()
    );
  }

  delay(20);
}
