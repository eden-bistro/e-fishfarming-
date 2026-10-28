# AquaSmart module audit and first safety fixes

Audit date: 2026-10-28  
Repository reviewed: `eden-bistro/e-fishfarming-`  
Base branch: `main`  
Audit branch: `audit/aquasmart-feeding-safety`

## Scope and evidence limits

This is a source-code review of the current default branch plus the targeted changes on this branch. It is not a live production verification, a database migration, or a physical ESP32 test. Any statement below about runtime behaviour remains unverified until the relevant test is run against a controlled environment.

## Findings

### Feeding and IoT — high priority

1. **Manual feeding UI previously reported dispensing without sending a device command.** The manual screen called `pushManualFeedingEvent`, then deducted inventory and added a production event, while the backend endpoint records an event rather than queuing a feeder command. The UI then showed a success message saying feed had been dispensed. This conflated a record write with physical execution.
2. **Manual pond selection did not control the backend target.** The screen offered Pond A/B/C labels but the command/event helpers use the active pond ID from tenant settings. The displayed pond could therefore differ from the backend target.
3. **Feeding history previously inferred completion from timestamp alone.** A past timestamp could display as “Completed” even if the stored status did not confirm completion.
4. **Device registry is a deployment prerequisite.** `src/lib/iot-device-commands.ts` returns HTTP 503 if `IOT_DEVICE_REGISTRY_JSON` is not configured. The existence of this handler does not prove a device is registered or connected.
5. **Command retry/idempotency needs dedicated tests.** New commands are created with Firebase POST-generated IDs. A repeated request can create more than one command unless a client-generated idempotency key or equivalent deduplication mechanism is introduced. Do not assume retry safety.
6. **Device acknowledgement/execution has not been physically verified.** The API supports `queued`, `ack`, `done`, and `failed` status transitions, but no connected ESP32 test has been performed as part of this audit.

### Water quality and alerts — partial, runtime unverified

- `src/components/dashboard/water-monitoring.tsx` calls `getLatestOnlineWaterReading` and renders an explicit no-online-reading state instead of fabricated sample values.
- The client fetches a protected latest-reading endpoint and checks device status. Whether production credentials, Firebase paths, and the live sensor payload align has not been verified against the deployed Worker.
- Water alert code can request protected alerts and derive some alerts from the latest reading. Threshold consistency, alert persistence, and the end-to-end telemetry path still require controlled tests.

### Authentication and farm access — source controls exist, test required

- Protected IoT handlers use `getAuthorizedUser` and `requireFarmAccess`; the server validates the bearer token against Supabase Auth rather than trusting client-provided role metadata.
- Session refresh, expiry behaviour, verified-email requirements, admin allowlisting, and cross-farm denial need integration tests. This source review does not establish that all routes and all non-IoT modules enforce equivalent controls.
- `src/lib/tenant.ts` derives the farm ID from the authenticated session user ID. Pond selection is stored locally and should be validated against actual farm/pond records before it is used for writes.

### Farm/pond, hatchery/inventory, finance, AI — not fully audited yet

These modules require a separate path-by-path review of read/write functions, ownership constraints, calculation logic, provider errors, and persisted data. No end-to-end completion claim is made for these modules in this report.

## Changes on this branch

1. Manual feeding now queues a `dispense_feed` command for the configured active pond and shows command status returned by the command API.
2. The UI no longer deducts inventory or creates a production event merely because a command was queued.
3. The UI explicitly states that queued does not mean dispensed.
4. Feeding history uses the recorded status rather than treating any past timestamp as proof of completion.
5. The UI no longer presents a local Pond A/B/C selection that does not affect the backend pond ID.

## Required verification before production use

- Run repository CI (lint, typecheck, tests, build) on this branch.
- Test signed-in and signed-out access, expired sessions, cross-farm access denial, and invalid pond IDs.
- With no device connected, verify a command is displayed as queued and is not represented as dispensed.
- In a controlled simulator, verify due-time scheduling, device registry authorization, acknowledgement, completion/failure reporting, offline handling, and duplicate/retry behaviour.
- Connect the physical ESP32 only after the simulated contract passes; verify measured feed output and device reports before updating inventory or production records.
- Verify the deployed Worker revision and required environment bindings separately. Do not change Firebase rules as part of this branch.

## Status vocabulary

- **Source-confirmed:** visible in the reviewed code.
- **Runtime-verified:** tested against a running environment with recorded evidence.
- **Planned/unverified:** recommended work not yet implemented or not tested.

At the time of this audit, the code findings and branch changes are source-confirmed; production runtime behaviour and physical feeder operation are not runtime-verified.
