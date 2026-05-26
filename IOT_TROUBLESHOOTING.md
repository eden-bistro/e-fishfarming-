# IoT Ingest Troubleshooting (ESP32 -> Cloudflare -> Firebase RTDB)

## 1) Confirm production deploy target

- Deploy from the branch/commit you expect.
- In Cloudflare, verify the **Production** environment (not Preview) is active.

## 2) Verify required environment variables (Production)

- `IOT_INGEST_TOKEN`
- `FIREBASE_DATABASE_URL`
- `FIREBASE_SERVICE_ACCOUNT` (full JSON service account key as a single env value)

Then redeploy.

## 3) Check backend health

- `GET /api/health/env`
- Expect: `ok: true` and no missing keys.

If missing keys are listed, fix env vars and redeploy.

## 4) Validate ingest auth from device

ESP32 must send:

- `Authorization: Bearer <IOT_INGEST_TOKEN>`
- `Content-Type: application/json`

If token mismatches, backend returns `401 Unauthorized ingest token`.

## 5) Validate payload shape

Required JSON fields:

- `deviceId` (string)
- `temperature` (number)
- `ph` (number)

Optional:

- `dissolvedOxygen`
- `ammonia`

If required fields are missing/invalid, backend returns `400`.

## 6) Firebase service account issues

If response includes `OAuth token exchange failed` or `FIREBASE_SERVICE_ACCOUNT must be valid JSON`:

- Re-copy the service account JSON from Firebase/GCP IAM.
- Ensure JSON includes `client_email` and `private_key`.
- Ensure private key newline escapes are preserved in env storage.

## 7) Firebase write failures

If backend returns `502` with write details:

- Confirm `FIREBASE_DATABASE_URL` points to the correct RTDB instance.
- Confirm service account belongs to the same Firebase project.
- Confirm RTDB is enabled in the target project.

## 8) Smoke test with curl

```bash
curl -i -X POST "https://<your-domain>/api/iot/ingest" \
  -H "Authorization: Bearer <IOT_INGEST_TOKEN>" \
  -H "Content-Type: application/json" \
  --data '{"deviceId":"ESP32_001","temperature":27.4,"ph":7.2,"dissolvedOxygen":6.1,"ammonia":0.03}'
```

Expected success: `200` with `{"ok":true,...}`.
