#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

const char* WIFI_SSID = "YOUR_WIFI";
const char* WIFI_PASSWORD = "YOUR_PASSWORD";
const char* INGEST_URL = "https://your-worker-domain.com/api/iot/ingest";
const char* IOT_INGEST_TOKEN = "YOUR_INGEST_TOKEN";

unsigned long lastSendMs = 0;
const unsigned long SEND_INTERVAL_MS = 7000;

void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
}

void setup() {
  Serial.begin(115200);
  connectWifi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWifi();
  }

  if (millis() - lastSendMs < SEND_INTERVAL_MS) {
    delay(100);
    return;
  }
  lastSendMs = millis();

  const String deviceId = "ESP32_001";
  const float temperature = 27.4;
  const float ph = 7.2;
  const float dissolvedOxygen = 6.1;
  const float ammonia = 0.03;

  String body = "{";
  body += "\"deviceId\":\"" + deviceId + "\",";
  body += "\"temperature\":" + String(temperature, 2) + ",";
  body += "\"ph\":" + String(ph, 2) + ",";
  body += "\"dissolvedOxygen\":" + String(dissolvedOxygen, 2) + ",";
  body += "\"ammonia\":" + String(ammonia, 4);
  body += "}";

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  if (!http.begin(client, INGEST_URL)) {
    Serial.println("Backend ingest FAIL init");
    return;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + IOT_INGEST_TOKEN);

  int code = http.POST(body);
  String resp = http.getString();
  if (code >= 200 && code < 300) {
    Serial.printf("Backend ingest OK code=%d resp=%s\n", code, resp.c_str());
  } else {
    Serial.printf("Backend ingest FAIL code=%d resp=%s\n", code, resp.c_str());
  }
  http.end();
}
