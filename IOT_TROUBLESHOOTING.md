# IoT Ingest Troubleshooting (ESP32 -> Cloudflare -> Firebase RTDB)

Use this checklist when an ESP32 cannot publish readings to Firebase through `/api/iot/ingest`.

## 1) Verify deployed backend health

```bash
curl -i "https://<your-domain>/api/health/env"
```

A healthy response returns `200` with `ok: true`. If it returns missing variables, configure them in your deployment platform and redeploy.

Required for ingest:

- `IOT_INGEST_TOKEN`
- `FIREBASE_DATABASE_URL` or `VITE_FIREBASE_DATABASE_URL`
- one Firebase write-auth option:
  - preferred: `FIREBASE_SERVICE_ACCOUNT`
  - legacy: `FIREBASE_DATABASE_SECRET` or `FIREBASE_AUTH_TOKEN`

## 2) Verify backend route is deployed

```bash
curl -i "https://<your-domain>/api/iot/ingest"
```

`GET` is not the ingest method, but the endpoint should be handled by the deployed app. The actual device request must use `POST`.

## 3) Validate ingest auth from device

ESP32 must send:

```text
Authorization: Bearer <IOT_INGEST_TOKEN>
Content-Type: application/json
```

If the token mismatches, the backend returns `401 Unauthorized ingest token`.

## 4) Validate required payload fields

The backend requires:

- `deviceId` (string)
- `farmId` (string)
- `pondId` (string)
- `temperature` (number)
- `ph` (number)

Recommended sensor fields:

- `dissolvedOxygen` (number)
- `ammonia` (number)
- `nitrite` (number)
- `turbidity` (number)
- `firmware` (string)
- `rssi` (number)
- `freeHeap` (number)

If required fields are missing, the backend returns `400`.

## 5) Firebase write failures

If the backend returns `502` with write details:

- Confirm `FIREBASE_DATABASE_URL` points to the correct Realtime Database instance.
- Confirm Realtime Database is enabled in the target Firebase project.
- If using `FIREBASE_SERVICE_ACCOUNT`, confirm the JSON is valid and belongs to the same Firebase project.
- If using `FIREBASE_DATABASE_SECRET` or `FIREBASE_AUTH_TOKEN`, confirm the token has write access under `firebase/database.rules.json`.
- Confirm `firebase/database.rules.json` has been deployed.

## 6) Smoke test with curl

```bash
curl -i -X POST "https://<your-domain>/api/iot/ingest" \
  -H "Authorization: Bearer <IOT_INGEST_TOKEN>" \
  -H "Content-Type: application/json" \
  --data '{"deviceId":"ESP32_001","farmId":"default","pondId":"default","temperature":27.4,"ph":7.2,"dissolvedOxygen":6.1,"ammonia":0.03,"nitrite":0,"firmware":"v3.0-prod","rssi":-57,"freeHeap":188000}'
```

Expected success: `200` with `{"ok":true,...}` and `paths.latest`, `paths.history`, and `paths.deviceStatus` in the response.

## 7) Firebase paths to inspect

After a successful ingest, verify these Realtime Database paths:

- `/farms/default/ponds/default/water/latest`
- `/farms/default/ponds/default/water/history`
- `/farms/default/ponds/default/devices/status/ESP32_001`
- `/farms/default/ponds/default/alerts` when thresholds are crossed
