# ESP32 Commercial Integration Contract

This repo supports production ESP32 -> backend -> Firebase Realtime Database communication.

## Recommended device runtime features

- Wi-Fi reconnect loop
- HTTPS validation with a pinned/root CA from `secrets.h`
- device token storage with NVS (`Preferences`)
- retry/backoff logic
- deterministic payload fields with `deviceId`, `farmId`, and `pondId`
- NTP + RTC fallback for an optional device-side `timestamp`

## Firebase paths expected by frontend/backend

- Live latest sensors:
  - `/farms/{farmId}/ponds/{pondId}/water/latest`
- Water history stream:
  - `/farms/{farmId}/ponds/{pondId}/water/history/{readingId}`
- Water alert stream:
  - `/farms/{farmId}/ponds/{pondId}/alerts/{alertId}`
- Feeding event log:
  - `/farms/{farmId}/ponds/{pondId}/feeding/events/{eventId}`
- Feeding command queue:
  - `/farms/{farmId}/ponds/{pondId}/feeding/commands/{commandId}`
- Device heartbeat/status:
  - `/farms/{farmId}/ponds/{pondId}/devices/status/{deviceId}`

## Backend ingest endpoint

ESP32 devices should post to your deployed app backend, not directly to Firebase:

```text
POST https://<your-domain>/api/iot/ingest
Authorization: Bearer <IOT_INGEST_TOKEN>
Content-Type: application/json
```

Required JSON fields:

```json
{
  "deviceId": "ESP32_001",
  "farmId": "farmer_001",
  "pondId": "cage_001",
  "farmerId": "farmer_001",
  "cageId": "cage_001",
  "temperature": 27.4,
  "ph": 7.2,
  "dissolvedOxygen": 6.1,
  "ammonia": 0.03,
  "nitrite": 0
}
```

Recommended optional fields:

```json
{
  "timestamp": "2026-05-21T11:00:00.000Z",
  "firmware": "v3.1-fixedwifi",
  "rssi": -57,
  "freeHeap": 188000,
  "turbidity": 0
}
```

The backend maps a valid ingest payload to:

1. `/farms/{farmId}/ponds/{pondId}/water/latest`
2. `/farms/{farmId}/ponds/{pondId}/water/history/{readingId}`
3. `/farms/{farmId}/ponds/{pondId}/devices/status/{deviceId}`
4. `/farms/{farmId}/ponds/{pondId}/alerts/{alertId}` when thresholds are crossed

Without this mapping, `/water/live`, `/water/alerts`, `/settings/devices`, and history-driven pages will not reflect real device data.

## Feeding command contract (ESP32 consumer)

For each command under `feeding/commands`:

```json
{
  "action": "dispense_feed",
  "amountKg": 2.5,
  "targetPondId": "cage_001",
  "requestedBy": "operator@farm",
  "requestedAt": "2026-05-21T11:00:00.000Z",
  "status": "queued|ack|done|failed"
}
```

Recommended ESP32 command lifecycle:

1. read queued command
2. write status `ack`
3. perform dispense
4. write status `done` or `failed` with an optional reason

## Device status heartbeat contract

The backend writes device status from ingest payload telemetry:

```json
{
  "firmware": "v3.1-fixedwifi",
  "online": true,
  "rssi": -57,
  "freeHeap": 188000,
  "updatedAt": "2026-05-21T11:00:00.000Z"
}
```

## Required backend environment variables

- `IOT_INGEST_TOKEN` must match the ESP32 bearer token.
- `FIREBASE_DATABASE_URL` or `VITE_FIREBASE_DATABASE_URL` must point to the Realtime Database root URL.
- The app default Firebase read path now uses `farmer_001` / `cage_001`, matching the firmware `FARMER_ID` / `CAGE_ID` values.
- One Firebase write-auth option is required:
  - preferred: `FIREBASE_SERVICE_ACCOUNT` containing the service account JSON, or
  - legacy: `FIREBASE_DATABASE_SECRET` / `FIREBASE_AUTH_TOKEN`.

## Frontend APIs

- `listDeviceStatuses()`
- `queueFeedingCommand(...)`
- `listFeedingCommands(...)`

These are implemented in `src/lib/device-firebase.ts`.
