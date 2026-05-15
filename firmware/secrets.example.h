#pragma once

// Copy this file to secrets.h and fill real values.
// Never commit secrets.h.

#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define BACKEND_INGEST_URL "https://api.yourdomain.com/api/iot/ingest"
#define IOT_INGEST_TOKEN "YOUR_DEVICE_BEARER_TOKEN"

// Root CA for TLS pinning / HTTPS validation on ESP32.
#define TLS_ROOT_CA R"EOF(
-----BEGIN CERTIFICATE-----
YOUR_CA_CERT_HERE
-----END CERTIFICATE-----
)EOF"
