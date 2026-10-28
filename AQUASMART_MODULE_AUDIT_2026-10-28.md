# AquaSmart Module Audit — 28 October 2026

**Repository:** `eden-bistro/e-fishfarming-`  
**Branch audited:** `main` (source inspected through GitHub file API on 28 October 2026)  
**Purpose:** Identify implementation gaps before commercial review and future ESP32 integration.  
**Important limitation:** This is a source-code review, not a live production penetration test or end-to-end runtime test. No physical ESP32/feeder is connected, and no production database was modified.

## Executive summary

AquaSmart has meaningful backend and security foundations: protected IoT routes validate Supabase sessions server-side; farm access is checked on IoT endpoints; water monitoring and dashboard feeding summaries call data-access functions; device commands have a documented lifecycle; device credentials can be bound to a fixed farm and pond.

However, several UI flows still do not represent a complete operational workflow. The highest-priority issue is manual feeding: the screen says **“Start Feeding Now”** and reports that feed was dispensed, but its handler records a manual feeding event rather than queueing a feeder command or waiting for device acknowledgement. The selected pond is also not passed to that event function. The “Recent Manual Feeds” panel contains fixed sample records. This must be corrected before the interface is presented as a working automated-feeding function.

Cage management is currently local-browser storage only. Inventory and production services can fall back to local storage and do not consistently fail the UI action when a remote write fails. This can make data appear saved on one browser without being durable or shared across devices.

## Findings by severity

### P0 — Manual feeding reports a physical action that is not performed by the code

**Evidence**
- `src/routes/feeding.manual.tsx`
  - The button handler calls `pushManualFeedingEvent(amount[0])`, then deducts local inventory and adds a production event.
  - It does not call `queueFeedingCommand(...)` and does not wait for device acknowledgement or completion.
  - The success toast says “Dispensed … kg”, which overstates what the code verifies.
  - The selected display value (`Pond A/B/C`) is not passed to `pushManualFeedingEvent`.
  - “Recent Manual Feeds” is rendered from a literal array with example names, dates, ponds, and amounts.
- `src/lib/platform-clients.ts`: `pushManualFeedingEvent` writes an event log to `/api/iot/feeding-event`; the handler `src/lib/iot-feeding-event.ts` writes an event record, not a command to actuate a feeder.

**Risk:** False operational records and inventory deductions; users may believe fish were fed when no feeder command was sent. If a real feeder is connected later, confusing event logging with device control could lead to unsafe operation.

**Required fix:** Separate “record a manual feeding that already happened” from “request a feeder to dispense”. For device control, select a real farm-owned pond/cage ID, queue a command through the protected command API, display queued/acknowledged/completed/failed states, and only record actual dispensed feed / deduct inventory after a confirmed successful device result. Replace sample history with persisted events. Keep the UI explicit that dispensing is unavailable until a device is registered and connected.

### P1 — Command lifecycle is not yet proven duplicate-safe

**Evidence**
- `src/lib/iot-device-commands.ts`: device polling returns queued commands; acknowledgement and completion are validated through read-then-update requests.
- `firmware/ESP32_COMMERCIAL_INTEGRATION.md`: the documented ESP32 contract polls commands and posts `ack`, then `done` or `failed`.

**Risk:** A read-then-update status transition is not an atomic claim by itself. A device/network retry or competing poller could observe a command more than once. Software must not assume a queued command is exactly-once.

**Required fix / test:** Define a durable command ID and device-side processed-ID/idempotency rule; ensure a command cannot trigger dispensing twice after retry/reboot; verify status transition behavior under duplicate acknowledgement, duplicate completion, timeout, and concurrent polling. Do not claim exactly-once dispensing without a tested hardware protocol.

### P1 — Cage management is local-only, not shared persistent farm data

**Evidence**
- `src/services/modules/cages.service.ts`: `listCages`, `createCage`, `updateCage`, and `deleteCage` read/write `localStorage`.
- `src/routes/cages.index.tsx` uses these synchronous local functions.

**Risk:** Cage records exist only in that browser and will not reliably synchronize to another device or user session. This also means feeding commands may use cage/pond identifiers that do not exist in the backend/device registry.

**Required fix:** Use the authenticated tenant-scoped backend for cage CRUD, surface remote errors, and explicitly label any offline/local-only mode. Add tests for cross-user isolation and reload/device persistence.

### P1 — Inventory and production writes can appear successful when remote persistence is incomplete

**Evidence**
- `src/services/modules/inventory.service.ts` and `src/services/modules/production.service.ts` update local storage first.
- Remote write helpers in `src/services/modules/backend-store.ts` return boolean/null on failure; some service methods ignore those results and return the local record.
- Inventory movement changes the locally cached quantity; remote movement and item writes are separate requests rather than one atomic transaction.

**Risk:** The browser may display a saved stock or production change even when Supabase rejected the write. A failure between a movement insert and quantity update can cause inventory inconsistency.

**Required fix:** Make write outcomes explicit to the caller; do not show “saved” unless remote persistence succeeded (unless a clearly labeled offline queue is implemented). Update stock quantity and movement history atomically on the server, validate non-negative stock, and test failed/duplicate requests.

### P1 — Admin assignment uses a hard-coded email allowlist

**Evidence**
- `src/lib/server-authz.ts` grants the `admin` role to the verified account whose email equals `fishhydro1@gmail.com`, otherwise it reads server-provided `app_metadata.role`.
- `src/services/auth.service.ts` mirrors this role display logic client-side.

**Assessment:** The server validates the bearer token with Supabase Auth and checks verified email before applying the allowlist, which is stronger than trusting editable user metadata. However, hard-coded identity-based role assignment is difficult to rotate and audit and should be an explicit deployment policy, not a hidden code assumption.

**Required fix:** Prefer a server-controlled role claim or maintained admin allowlist in configuration; never authorize from user-editable `user_metadata` or a client-stored role. Add tests for ordinary users, modified client state, unverified users, and role revocation.

### P1 — Default pond fallback can route reads to an unintended pond

**Evidence**
- `src/lib/tenant.ts` uses `VITE_DEFAULT_POND_ID` or `cage_001` when no active pond is selected.
- `src/lib/iot-alerts.ts` and `src/lib/iot-feeding-command.ts` also use a default pond fallback for requests that omit `pondId`.

**Risk:** A user without a configured selection can view alerts or commands for a default pond that may not be the intended pond. This is particularly risky for feeding commands.

**Required fix:** Require an explicit, authorized pond/cage ID for command creation and pond-scoped operational actions. Default selection may be used for a clearly labeled empty-state UI, not as an implicit target for actuation.

### P1 — Finance and other data modules require persistence and calculation verification

**Evidence**
- `src/lib/platform-clients.ts` sends finance requests to Supabase REST using the current access token when available and the anon key otherwise; RLS is therefore a critical security boundary.
- Finance methods catch list errors and return empty arrays; mutations can fall back to the submitted local object when no row is returned.
- `supabase/rls-policies.sql` contains repeated `farm_profiles` policy definitions in the source file and mixes legacy `farm_id` scoping with newer `tenant_id` scoping.

**Risk:** Backend errors may be indistinguishable from a genuinely empty farm. The SQL source needs to be checked against the migrations actually applied to the connected project; changing the source file alone does not update production RLS. Financial totals also need reconciliation tests.

**Required fix / test:** Validate income/expense CRUD under two different users, verify RLS on the deployed schema, show load/save errors separately from empty states, and reconcile totals against known test transactions. Do not apply RLS/schema changes to the live project without reviewing the deployed schema and migration history.

### P2 — Water monitoring is connected to a protected endpoint, but real telemetry is not verified

**Evidence**
- `src/components/dashboard/water-monitoring.tsx` polls `getLatestOnlineWaterReading()` every 15 seconds.
- `src/lib/platform-clients.ts` obtains the latest reading through `/api/iot/latest` and checks device status.
- `src/lib/iot-latest.ts` requires a verified Supabase-authenticated user and farm authorization.

**Assessment:** The code path is API-backed, and an empty state exists. This is a positive change from the older audit. It is still unverified whether the deployed Worker has the matching latest code, whether the Firebase service credentials and device registry are configured, and whether an ESP32 has sent valid telemetry. The UI's safety thresholds should also be reviewed as farm/species-specific operational settings rather than universal guarantees.

**Required test:** Confirm unauthenticated requests return 401/403, authorized users only access their own farm, invalid/out-of-range payloads are rejected, stale devices are shown offline, and a real ingest becomes visible in the dashboard and history. No sensor data should be presented as live until it is sourced from a fresh device reading.

### P2 — Feeding schedule UI is connected to command APIs, but is not proof of scheduled execution

**Evidence**
- `src/components/dashboard/feeding-schedule.tsx` calls `listFeedingEvents()`.
- `src/routes/feeding.schedule.tsx` uses `queueFeedingCommand` and `listFeedingCommands`.
- `src/lib/iot-device-commands.ts` returns queued commands only when their `scheduledFor` time is due.

**Assessment:** Scheduling and command queue foundations exist. A scheduled record is not the same as a successfully dispensed feed. The UI and lifecycle must distinguish queued, acknowledged, done, failed, and expired/offline commands.

**Required test:** Verify timezone conversion, due-time behavior, command ownership, invalid pond rejection, device offline behavior, and that completion only follows a device report. Test with a simulated device before connecting hardware.

### P2 — Hatchery, AI, and finance operational behavior is not fully verified in this pass

The repository contains modules and services for hatchery/inventory, AI insights/assistant, and finance, but this source review did not establish complete end-to-end correctness for every hatchery batch transition, AI provider call, or finance calculation. These should remain **implemented but unverified**, not labeled fully operational, until targeted tests pass.

## Module status matrix

| Module | Source-code status | Verification status | Main next action |
|---|---|---|---|
| Authentication | Supabase Auth integration and refresh-token handling present | Protected-route and revocation behavior not runtime-tested | Test invalid/expired token, logout, refresh failure, verified email, role changes |
| Farm profile | Supabase-backed profile service with browser cache | Multi-user persistence not runtime-tested | Test read/write and tenant isolation |
| Cage/farm operations | Cage CRUD currently localStorage-backed | Not durable/shared | Migrate to tenant-scoped backend |
| Water quality | Protected Worker API path and live-data empty state | No live ESP32 end-to-end proof | Test auth, ingest, freshness, history, alerts |
| Water alerts | Protected Worker API path plus derived alert fallback | Live Firebase alert flow unverified | Test threshold boundaries and persisted alerts |
| Feeding schedule | Command queue API and schedule UI exist | Hardware execution unverified | Test due time, target IDs, status lifecycle and idempotency |
| Manual feeding | Records a manual event; does not queue a dispense command | Misleading success text and sample history remain | Separate record-event vs command-to-device workflows |
| Inventory | Local cache plus optional remote calls | Remote-write failures may be masked | Atomic stock ledger and visible persistence errors |
| Production records | Local cache plus optional remote calls | Remote-write failures may be masked | Verify remote persistence and duplicate handling |
| Finance | Supabase REST CRUD and farm scoping via RLS | Totals, error states, deployed RLS not verified | Reconciliation and two-tenant tests |
| AI assistant/insights | Feature/module present | Provider success and failure handling not established | Exercise configured provider, timeout, quota, and no-key cases |
| Hatchery/brooders/fingerlings | Feature/module present | Full lifecycle/persistence not established | Test batch transitions, counts, mortality, and tenant isolation |
| Device registry | Protected per-device token/farm/pond binding implemented in code | Worker secret configuration and real device not verified | Confirm registry exists without exposing token; run simulated-device tests |

## Recommended remediation order

1. **Correct manual feeding semantics** and remove sample history; never mark a command completed or deduct inventory until the operation's source and status are clear.
2. **Make pond/cage identity authoritative** and remove implicit defaults from actuation paths.
3. **Make inventory, production, and cage persistence truthful**: durable backend write, clear failure UI, and atomic stock movement.
4. **Add command idempotency and simulated-device tests** before hardware connection.
5. **Run auth and tenant-isolation tests** against the actual deployed Worker and Supabase RLS.
6. **Verify water ingest/alerts with a simulated ESP32 payload**, then validate real sensors when hardware is available.
7. **Test finance, AI, and hatchery workflows** with controlled fixtures and visible failure states.
8. **Verify deployment lineage and required Worker secrets** before claiming the current `main` code is live.

## Verification checklist before commercial claims

- [ ] The deployed Worker version is confirmed to match the reviewed commit.
- [ ] Anonymous calls to protected IoT endpoints are rejected.
- [ ] A second farm user cannot read or modify the first user's records.
- [ ] A simulated device can authenticate, ingest a reading, and show fresh telemetry.
- [ ] A queued command targets the correct registered device and pond.
- [ ] Duplicate polls/retries cannot dispense the same command twice.
- [ ] Manual feeding history comes from persisted events, not literals.
- [ ] Inventory/production/cage writes report backend failure rather than silently falling back.
- [ ] Finance totals reconcile with known transactions and RLS is verified on the deployed database.
- [ ] AI provider success, timeout, and configuration failures are handled clearly.
- [ ] Hatchery batch operations persist and maintain valid counts.
- [ ] Physical dispensing is not claimed until the real feeder is connected and tested.

## Scope and safety notes

This audit intentionally makes no production database, Firebase rules, Worker secrets, or deployment changes. The source review can identify code-level gaps, but deployed configuration and end-to-end behavior require separate verification. Keep the physical device disconnected until command routing, idempotency, and status handling have passed simulation tests.
