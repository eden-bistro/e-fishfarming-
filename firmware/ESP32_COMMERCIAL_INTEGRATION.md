# ESP32 Commercial Integration Contract

This repo is now structured to support production ESP32 ↔ Firebase communication.

## .ino structure review
Your sketch is well-structured for production:
- secure TLS transport (`WiFiClientSecure` + root CA)
- persistent offline queue with NVS (`Preferences`)
- retry/backoff logic
- deterministic payload fields with `readingId`
- NTP + RTC fallback

## Firebase paths expected by frontend/backend
- Live latest sensors:
  - `/farms/{farmId}/ponds/{pondId}/water/latest`
- Water alert stream:
  - `/farms/{farmId}/ponds/{pondId}/alerts/{alertId}`
- Feeding event log:
  - `/farms/{farmId}/ponds/{pondId}/feeding/events/{eventId}`
- **NEW** feeding command queue:
  - `/farms/{farmId}/ponds/{pondId}/feeding/commands/{commandId}`
- **NEW** device heartbeat/status:
  - `/farms/{farmId}/ponds/{pondId}/devices/status/{deviceId}`

## Feeding command contract (ESP32 consumer)
For each command under `feeding/commands`:
```json
{
  "action": "dispense_feed",
  "amountKg": 2.5,
  "targetPondId": "pond-a",
  "requestedBy": "operator@farm",
  "requestedAt": "2026-05-21T11:00:00.000Z",
  "status": "queued|ack|done|failed"
}
```

Recommended ESP32 command lifecycle:
1. read queued command
2. write status `ack`
3. perform dispense
4. write status `done` (or `failed` with optional reason)

## Device status heartbeat contract
ESP32 should periodically publish:
```json
{
  "firmware": "v3.0-prod",
  "online": true,
  "rssi": -57,
  "freeHeap": 188000,
  "updatedAt": "2026-05-21T11:00:00.000Z"
}
```

## Frontend APIs added
- `listDeviceStatuses()`
- `queueFeedingCommand(...)`
- `listFeedingCommands(...)`

These are implemented in `src/lib/esp32-firebase.ts`.
