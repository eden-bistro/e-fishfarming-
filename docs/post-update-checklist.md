# Post-update safety checklist

Use this checklist after every pull, commit, or generated update. The goal is to verify the repo without deleting communication code or local test assets by mistake.

## 1. Confirm the working tree first

```powershell
git pull
git log -1 --oneline
git status --short
```

If `git status --short` prints nothing, the repo is clean.

## 2. Inspect before deleting or resetting anything

Never delete or reset these communication files without reviewing their diffs first:

- `src/lib/device-firebase.ts`
- `src/lib/platform-clients.ts`
- `src/server.ts`
- `src/lib/iot-firebase.ts`
- `src/lib/iot-setup.ts`
- `src/lib/iot-latest.ts`
- `src/lib/iot-devices.ts`
- `src/routes/settings.devices.tsx`
- `firmware/esp32_ingest_example.ino`
- `firmware/secrets.example.h`
- `payload.json`

Review local code changes with:

```powershell
git diff src/lib/device-firebase.ts
git diff src/lib/platform-clients.ts
git diff src/routeTree.gen.ts
```

Only reset a file after confirming the change is unwanted.

## 3. Keep local API debug files without committing them

Files such as `body.txt`, `headers.txt`, `body-latest.txt`, `headers-latest.txt`, and `iot-setup.json` are local smoke-test artifacts. They are useful for debugging, but they should not be committed.

To preserve them safely, move them into a local backup folder:

```powershell
New-Item -ItemType Directory -Force .\local-debug-backup
Move-Item .\body*.txt .\local-debug-backup\ -ErrorAction SilentlyContinue
Move-Item .\headers*.txt .\local-debug-backup\ -ErrorAction SilentlyContinue
Move-Item .\iot-setup.json .\local-debug-backup\ -ErrorAction SilentlyContinue
```

A safe reusable setup payload is tracked at `examples/iot-setup.example.json`.

## 4. Run the required checks

```powershell
npm run typecheck
npm run test
npm run build
git diff --check
```

`npm run typecheck` automatically runs route generation first through `pretypecheck`.

## 5. Verify IoT communication after deployment

After deployment, verify the latest telemetry endpoint:

```powershell
curl.exe -sS "https://e-fishfarm.kwizerorigene1998.workers.dev/api/iot/latest?farmId=farmer_001&pondId=cage_001"
```

If this returns water values but the frontend still shows `--`, the backend has data and the next step is to inspect the frontend fetch path/browser console.
