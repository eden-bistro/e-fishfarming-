#pragma once

// Copy this file to secrets.h and fill real values.
// Never commit secrets.h. The real secrets file is ignored by Git.

#define WIFI_SSID "Ok"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define BACKEND_INGEST_URL "https://e-fishfarm.kwizerorigene1998.workers.dev/api/iot/ingest"
#define IOT_INGEST_TOKEN "YOUR_DEVICE_BEARER_TOKEN"

#ifndef FARMER_ID
#define FARMER_ID "DEVICE_ASSIGNED_FARM_ID"
#endif

#ifndef CAGE_ID
#define CAGE_ID "DEVICE_ASSIGNED_CAGE_ID"
#endif

#ifndef DEVICE_ID
#define DEVICE_ID "DEVICE_PRINTED_ID"
#endif

#ifndef FIRMWARE_VERSION
#define FIRMWARE_VERSION "v3.1-fixedwifi"
#endif

// Root CA for TLS pinning / HTTPS validation on ESP32.
// Replace this placeholder with the root CA that validates your Worker domain.
#define TLS_ROOT_CA R"EOF(
-----BEGIN CERTIFICATE-----
YOUR_CA_CERT_HERE
-----END CERTIFICATE-----
)EOF"
