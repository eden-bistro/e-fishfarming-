# AquaSmart Module Audit — 28 October 2026

**Repository:** `eden-bistro/e-fishfarming-`  
**Reviewed branch:** current `main` source retrieved on 28 October 2026  
**Purpose:** Identify implementation gaps and verification requirements before commercial review and ESP32 integration.

## Scope and evidence limits

This is a source-code audit. It is not a production penetration test, a live database verification, or a physical-device test. No production code, database schema, Firebase rules, Worker secrets, or production deployment was changed as part of this audit. The ESP32/feeder is not connected, so physical dispensing is **not verified**.

The manual-feeding safety fix was merged in PR #205 (merge commit `eb7e2258256c08493833dfefaad82e0af98fbf35`). This report reflects that fix rather than the earlier pre-fix code.

## Executive summary

AquaSmart has useful foundations: Supabase-authenticated user sessions, protected Cloudflare Worker IoT endpoints, farm authorization checks on protected handlers, an API-backed latest-water-reading path, and a Firebase-backed command queue for feeding. Manual feeding now queues a command for the active pond, displays command status, and does not automatically deduct feed inventory or create a production event merely because a command was queued.

The system is **not yet verified end-to-end**. Highest-priority gaps are command retry/idempotency and device simulation, default pond fallback, local-only cage records, inventory/production persistence that may mask remote-write failures, and insufficient runtime verification of tenant isolation, telemetry, finance, AI, and hatchery workflows.

## Findings by severity

### P0/P1 — Feeding command safety and lifecycle

**Source-confirmed current behaviour**
- `src/routes/feeding.manual.tsx` calls `queueFeedingCommand`, displays the active pond ID, and labels the result as queued rather than dispensed.
- The manual screen no longer deducts inventory or creates a production event merely because a command was queued.
- `src/components/dashboard/feeding-schedule.tsx` reads feeding events through `listFeedingEvents()`; it does not, by itself, prove that queued device commands have executed.
- `src/routes/feeding.schedule.tsx` creates scheduled commands, while `src/lib/iot-device-commands.ts` only returns queued commands once their scheduled time is due.
- The device endpoint requires `IOT_DEVICE_REGISTRY_JSON`; it returns HTTP 503 if the registry is not configured.
- Command status transitions use a read-then-update sequence. A duplicate client request can create more than one command, and the current code does not establish exactly-once physical dispensing.

**Risk**
Retries, concurrent polling, device reboot, or lost acknowledgements could cause a command to be seen again. The UI can accurately show a queued command, but hardware execution and physical feed quantity remain unknown until a device reports completion and the result is tested.

**Required tests/fixes**
1. Define durable command IDs and a device-side processed-ID/idempotency rule.
2. Test repeated requests, duplicate acknowledgements/completions, concurrent polling, device reboot, network timeout, and failed dispensing with a simulator.
3. Confirm command target IDs match a registered farm/pond and reject unconfigured targets.
4. Distinguish queued, acknowledged, device-reported done, failed, and stale/offline states in every relevant UI.
5. Do not record completed feeding or reconcile inventory/production until there is an explicit, trusted execution result.

### P1 — Pond defaults can silently select a target

**Evidence**
- `src/lib/tenant.ts` falls back to `VITE_DEFAULT_POND_ID` or `cage_001` when no active pond is stored.
- Feeding commands and other pond-scoped paths must not treat a display default as proof that the target exists or is assigned to the authenticated farm.

**Risk**
A command may be aimed at a default identifier that is not the intended or registered pond.

**Required fix**
Require an explicit, server-authorized pond/device binding for actuation. Keep defaults only for clearly labelled UI empty states; reject command creation when the real target is not configured.

### P1 — Cage management is browser-local, not shared farm data

**Evidence**
- `src/services/modules/cages.service.ts` stores cage records in `localStorage`.
- `src/routes/cages.index.tsx` uses those local synchronous CRUD functions.

**Risk**
Cages created in one browser are not durable shared records and may not exist for another user/device or in the backend used by IoT commands. Feeding scheduling also consults this local cage list when calculating available fish.

**Required fix**
Move cage CRUD to an authenticated, tenant-scoped backend. Surface save failures and test persistence after reload, across browsers, and between different farm users before using cage data for automated operations.

### P1 — Inventory and production persistence can mislead users

**Evidence**
- `src/services/modules/inventory.service.ts` writes to local storage before awaiting remote persistence.
- `src/services/modules/production.service.ts` and shared helpers need equivalent failure-path verification.
- Inventory movements and quantity changes are not shown to be one atomic server-side transaction; some remote helper results may be ignored.

**Risk**
A UI may display a change that was not durably saved, or inventory movement history and stock quantity may disagree after a partial failure.

**Required fix**
Make remote write success/failure explicit. Do not show “saved” when the remote write failed unless a deliberately designed offline queue is visible to the user. Implement atomic stock-ledger updates on the server, validate non-negative stock, and test failures and duplicate submissions.

### P1 — Authentication and tenant isolation need integration tests

**Source-confirmed controls**
- Protected IoT handlers use server-side Supabase session verification and farm-access checks.
- Server authorization does not rely on user-editable `user_metadata.role` to grant admin.
- The admin allowlist currently includes a hard-coded verified email in `src/lib/server-authz.ts`.

**Unverified**
Source review does not establish that every non-IoT route, finance table, and hatchery/inventory operation enforces equivalent tenant isolation, or that session expiry, refresh failure, logout, and role revocation all work correctly.

**Required tests**
Use two test farm users and verify cross-farm read/write denial, invalid and expired tokens, refresh failures, verified-email requirements, role changes, and client-side role tampering. Prefer a maintained server-side admin configuration over a hidden hard-coded email rule.

### P2 — Water quality and alerts have API wiring, but no verified live telemetry

**Evidence**
- `src/components/dashboard/water-monitoring.tsx` polls `getLatestOnlineWaterReading()` and shows an explicit no-device-data message when no reading is available.
- `src/lib/platform-clients.ts` requests the protected `/api/iot/latest` endpoint.
- The protected latest-reading handler checks the authenticated user and farm access.

**Unverified**
No current ESP32 telemetry is available because the device is not connected. The deployed Worker version, device registry, Firebase service configuration, reading freshness, alert persistence, and the complete ingest-to-dashboard path have not been verified together.

**Required tests**
Verify anonymous requests are rejected, farm A cannot read farm B, malformed/out-of-range readings are rejected, stale devices appear offline, and a simulated reading reaches the dashboard/history and triggers expected alert boundaries. Treat thresholds as farm/species-specific configuration, not universal guarantees.

### P2 — Finance needs reconciliation and deployed RLS verification

Finance CRUD and Profit & Loss features exist, but source presence does not establish correct calculations or deployed authorization. Some data-access methods can turn request errors into empty arrays or return the submitted object when the server does not return a persisted row. The repository RLS SQL must be compared with the actual deployed schema and migration history before changes are applied.

**Required tests**
Reconcile income, expenses, and profit against known test transactions; test date filters and duplicate submissions; verify reads/writes with two different farm users; and display load/save errors separately from genuine empty states. Do not change live RLS or schema without reviewing the deployed state.

### P2 — AI and hatchery workflows remain implemented but unverified

AI assistant/insights and hatchery, brooder, and fingerling modules are present in the repository. This pass did not establish full runtime correctness for every AI provider request, timeout/quota/configuration failure, hatchery batch transition, stock count, mortality, or tenant-isolation path.

**Required tests**
Exercise configured AI provider success and failure paths; test hatchery batch creation and transitions, counts, mortality, and persistence; and verify all records remain scoped to the authenticated farm.

## Module status matrix

| Module | Source-code assessment | Verification status | Next action |
|---|---|---|---|
| Authentication | Supabase session integration and server authorization controls exist | Runtime/session and cross-tenant tests incomplete | Test expiry, refresh, role revocation, and two-farm isolation |
| Farm profile | Backend service with browser cache | Shared persistence not runtime-tested | Verify read/write and ownership |
| Cage management | CRUD is localStorage-backed | Not durable/shared | Move to tenant-scoped backend |
| Water quality | Protected latest-reading API path | No real ESP32 end-to-end proof | Simulated ingest, freshness, history, alerts |
| Water alerts | Protected API/derived alert path exists | Threshold and persistence tests incomplete | Test boundaries and ownership |
| Manual feeding | Queues command; does not claim physical dispensing | Source fix merged; device execution unverified | Simulator and device lifecycle tests |
| Scheduled feeding | Due-time command queue path exists | Timezone/offline/idempotency not proven | Test due time and retries |
| Inventory | Local cache plus remote calls | Remote failures/atomicity require work | Truthful errors and atomic stock ledger |
| Production records | Service/module exists | Persistence and duplicate handling unverified | Test remote failure and reconciliation |
| Finance/P&L | CRUD/reporting features exist | Calculations and deployed RLS unverified | Known-transaction reconciliation and tenant tests |
| AI assistant/insights | Provider integration/features exist | Provider success/failure not fully verified | Test success, timeout, quota, and missing key |
| Hatchery/brooders/fingerlings | Features exist | Full lifecycle/persistence unverified | Test batch transitions and counts |
| Device registry | Server-side device/farm/pond binding supported | Runtime registry configuration not verified | Verify configuration without exposing tokens |

## Recommended remediation order

1. Add command idempotency and simulated-device tests before connecting hardware.
2. Remove implicit default pond targets from all actuation paths.
3. Migrate cage CRUD to a tenant-scoped backend.
4. Make inventory and production persistence errors explicit and stock updates atomic.
5. Run authentication and tenant-isolation tests against the actual Worker and deployed Supabase RLS.
6. Test telemetry ingest, freshness, and alerts using a simulator.
7. Reconcile finance calculations and test AI/hatchery failure paths.
8. Confirm the production Worker revision and required bindings before claiming that current source is live.

## Commercial-readiness checklist

- [ ] Production Worker revision matches the reviewed commit.
- [ ] Anonymous requests to protected IoT endpoints are rejected.
- [ ] A second farm user cannot access the first user's records.
- [ ] A simulated device can authenticate and submit a valid reading.
- [ ] Invalid/stale telemetry is rejected or clearly marked.
- [ ] A feeding command targets the correct registered device and pond.
- [ ] Retries/reboots cannot dispense the same command twice in simulator tests.
- [ ] Feeding completion reflects a trusted device result, not a queued command or timestamp.
- [ ] Cage, inventory, and production writes report remote persistence failures.
- [ ] Finance totals reconcile against known transactions and deployed RLS is verified.
- [ ] AI provider failures and hatchery lifecycle errors are handled clearly.
- [ ] Physical dispensing is not claimed until the real feeder is connected and tested.

## Safety notes

This report makes no claim that physical dispensing works. Keep the ESP32 disconnected until command routing, idempotency, status transitions, and simulator tests pass. Do not deploy Firebase rules, alter production RLS/schema, or change Worker secrets as part of this documentation update.
