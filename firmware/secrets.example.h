#pragma once

// Copy this file to secrets.h and fill real values.
// Never commit secrets.h.

#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define BACKEND_INGEST_URL "https://api.yourdomain.com/api/iot/ingest"
#define IOT_INGEST_TOKEN "YOUR_DEVICE_BEARER_TOKEN"
#define FARM_ID "default"
#define POND_ID "default"
#define DEVICE_ID "ESP32_001"
#define FIRMWARE_VERSION "v3.1-ingest"

// Set to 1 for one upload only if your ESP32 has old invalid queued payloads.
// Return it to 0 after Serial Monitor shows "Queue cleared".
#define CLEAR_QUEUE_ON_BOOT 0

// Leave 0 in production. Set to 1 only for temporary TLS troubleshooting.
#define TLS_ALLOW_INSECURE 0

// Root CA for TLS pinning / HTTPS validation on ESP32.
#define TLS_ROOT_CA R"EOF(
-----BEGIN CERTIFICATE-----
YOUR_CA_CERT_HERE
-----END CERTIFICATE-----
)EOF"
