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
  "deviceId": "DEVICE_PRINTED_ID",
  "farmId": "DEVICE_ASSIGNED_FARM_ID",
  "pondId": "DEVICE_ASSIGNED_CAGE_ID",
  "farmerId": "DEVICE_ASSIGNED_FARM_ID",
  "cageId": "DEVICE_ASSIGNED_CAGE_ID",
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

**Do not read or write the Realtime Database directly from the ESP32.** The production security target is to deny direct client/device access to Firebase and route device command operations through the Cloudflare Worker.

Poll commands with:

```text
GET https://<your-domain>/api/iot/device-commands?deviceId=DEVICE_PRINTED_ID
Authorization: Bearer <DEVICE_SPECIFIC_TOKEN>
```

The device token must be a unique high-entropy token configured for that exact `deviceId` in the Worker secret `IOT_DEVICE_REGISTRY_JSON`. The registry binds the device to one fixed farm and pond; the device must not supply its own farm or pond identifiers to this endpoint.

Acknowledge or finish a command with:

```text
POST https://<your-domain>/api/iot/device-commands?deviceId=DEVICE_PRINTED_ID
Authorization: Bearer <DEVICE_SPECIFIC_TOKEN>
Content-Type: application/json

{"commandId":"FIREBASE_COMMAND_KEY","status":"ack"}
```

Use `status: "done"` after successful dispensing or `status: "failed"` with an optional short `error` string if dispensing fails. The backend validates command ownership and allowed status transitions. The response from the API, not a direct Firebase write, is the acknowledgement.

Recommended ESP32 command lifecycle:

1. Poll the protected endpoint and select a queued command.
2. POST status `ack`.
3. Perform the dispensing operation.
4. POST status `done` or `failed` (include an optional `error`).
5. Retry with backoff on network failures; do not treat a failed API response as a successful status update.

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
- The app no longer has a default farm path. Every device payload must include its assigned `farmId`/`pondId` values, and frontend reads use the signed-in user farm plus selected cage.
- One Firebase write-auth option is required:
  - preferred: `FIREBASE_SERVICE_ACCOUNT` containing the service account JSON, or
  - legacy: `FIREBASE_DATABASE_SECRET` / `FIREBASE_AUTH_TOKEN`.

## Frontend APIs

- `listDeviceStatuses()`
- `queueFeedingCommand(...)`
- `listFeedingCommands(...)`

These are implemented in `src/lib/device-firebase.ts`.


## Device authorization and Firebase rules

Production deployments should configure the Cloudflare Worker secret `IOT_DEVICE_REGISTRY_JSON` with a unique high-entropy token and fixed `farmId`/`pondId` for every registered `deviceId`. Example shape:

```json
{
  "ESP32_001": {
    "token": "UNIQUE_RANDOM_DEVICE_SECRET",
    "farmId": "user_abc123",
    "pondId": "cage_001",
    "enabled": true
  }
}
```

The device must send the token registered for its own ID. The backend rejects mismatched IDs, tokens, farms, and ponds. Keep `IOT_INGEST_TOKEN` set during migration; when the device registry is absent, legacy shared-token mode remains available for compatibility and is less secure. After registering devices and updating firmware, keep the registry enabled.

Realtime Database rules in `firebase/database.rules.json` deny direct client reads and writes. The browser must use farm-authorized Worker APIs for water readings, alerts, device status, and feeding commands/events. Devices must submit telemetry through `/api/iot/ingest` and poll/update commands through `/api/iot/device-commands` using their own registry token. Cloudflare accesses Firebase using server-side credentials; enforce authorization in every Worker handler and never expose service-account credentials to the browser. Deploy deny-all rules only after the updated Worker is deployed and the protected API flows have been tested.
