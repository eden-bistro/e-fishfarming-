# Smart Aquaculture Enterprise Implementation Blueprint

_Date: May 20, 2026_

## 1) Target frontend folder tree (exact)

```text
src/
├── app/
│   ├── providers/
│   │   ├── auth-provider.tsx
│   │   ├── query-provider.tsx
│   │   ├── realtime-provider.tsx
│   │   └── theme-provider.tsx
│   ├── router/
│   │   ├── index.tsx
│   │   ├── guards.ts
│   │   └── route-tree.ts
│   └── bootstrap.tsx
├── assets/
│   ├── images/
│   ├── icons/
│   └── logos/
├── components/
│   ├── common/
│   ├── forms/
│   ├── tables/
│   ├── metrics/
│   ├── notifications/
│   └── ui/
├── charts/
│   ├── water/
│   ├── feeding/
│   ├── finance/
│   └── production/
├── contexts/
│   ├── auth-context.tsx
│   ├── tenant-context.tsx
│   ├── rbac-context.tsx
│   └── realtime-context.tsx
├── firebase/
│   ├── client.ts
│   ├── paths.ts
│   ├── alerts.ts
│   ├── devices.ts
│   ├── sensors.ts
│   └── commands.ts
├── hooks/
│   ├── use-auth.ts
│   ├── use-tenant.ts
│   ├── use-rbac.ts
│   ├── use-water-stream.ts
│   ├── use-alerts-stream.ts
│   └── use-paginated-query.ts
├── layouts/
│   ├── auth-layout.tsx
│   ├── main-layout.tsx
│   ├── dashboard-layout.tsx
│   └── report-layout.tsx
├── pages/
│   ├── auth/
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   ├── dashboard/
│   │   └── index.tsx
│   ├── cages/
│   │   ├── index.tsx
│   │   ├── create.tsx
│   │   ├── $cageId.tsx
│   │   └── $cageId.edit.tsx
│   ├── monitoring/
│   │   ├── live.tsx
│   │   ├── history.tsx
│   │   └── devices.tsx
│   ├── feeding/
│   │   ├── schedule.tsx
│   │   ├── manual.tsx
│   │   ├── auto.tsx
│   │   ├── hybrid.tsx
│   │   └── logs.tsx
│   ├── production/
│   │   ├── batches.tsx
│   │   ├── growth.tsx
│   │   ├── mortality.tsx
│   │   ├── harvest.tsx
│   │   └── analytics.tsx
│   ├── inventory/
│   │   ├── feed.tsx
│   │   ├── medicine.tsx
│   │   ├── equipment.tsx
│   │   └── purchase-orders.tsx
│   ├── finance/
│   │   ├── income.tsx
│   │   ├── expenses.tsx
│   │   ├── ledger.tsx
│   │   ├── pnl.tsx
│   │   └── cashflow.tsx
│   ├── alerts/
│   │   ├── active.tsx
│   │   ├── history.tsx
│   │   └── rules.tsx
│   ├── reports/
│   │   ├── financial.tsx
│   │   ├── production.tsx
│   │   ├── water-quality.tsx
│   │   └── sales.tsx
│   ├── ai/
│   │   ├── assistant.tsx
│   │   ├── feed-optimizer.tsx
│   │   └── forecast.tsx
│   └── settings/
│       ├── farm.tsx
│       ├── users.tsx
│       ├── roles.tsx
│       └── integrations.tsx
├── services/
│   ├── auth.service.ts
│   ├── rbac.service.ts
│   ├── tenant.service.ts
│   ├── finance.service.ts
│   ├── production.service.ts
│   ├── feeding.service.ts
│   ├── inventory.service.ts
│   ├── reports.service.ts
│   └── alerts.service.ts
├── supabase/
│   ├── client.ts
│   ├── types.ts
│   ├── repositories/
│   │   ├── finance.repo.ts
│   │   ├── cages.repo.ts
│   │   ├── production.repo.ts
│   │   ├── inventory.repo.ts
│   │   └── users.repo.ts
│   └── policies/
├── utils/
│   ├── constants.ts
│   ├── dates.ts
│   ├── numbers.ts
│   ├── validation.ts
│   └── telemetry.ts
└── styles/
    ├── globals.css
    ├── tokens.css
    └── charts.css
```

---

## 2) Route map (enterprise)

### Auth

- `/auth/login`
- `/auth/register`
- `/auth/forgot-password`

### Dashboard

- `/dashboard`

### Cages

- `/cages`
- `/cages/new`
- `/cages/:cageId`
- `/cages/:cageId/edit`

### Monitoring + Devices

- `/monitoring/live`
- `/monitoring/history`
- `/monitoring/devices`

### Feeding

- `/feeding/schedule`
- `/feeding/manual`
- `/feeding/automatic`
- `/feeding/hybrid`
- `/feeding/logs`

### Fish Production

- `/production/batches`
- `/production/growth`
- `/production/mortality`
- `/production/harvest`
- `/production/analytics`

### Inventory

- `/inventory/feed`
- `/inventory/medicine`
- `/inventory/equipment`
- `/inventory/purchase-orders`

### Finance

- `/finance/income`
- `/finance/expenses`
- `/finance/ledger`
- `/finance/pnl`
- `/finance/cashflow`

### Alerts

- `/alerts/active`
- `/alerts/history`
- `/alerts/rules`

### Reports

- `/reports/financial`
- `/reports/production`
- `/reports/water-quality`
- `/reports/sales`

### AI

- `/ai/assistant`
- `/ai/feed-optimizer`
- `/ai/forecast`

### Settings

- `/settings/farm`
- `/settings/users`
- `/settings/roles`
- `/settings/integrations`

---

## 3) Data contracts

## 3.1 Supabase contracts (ERP / business source of truth)

### Core tenant + identity

- `farms`
  - `id uuid pk`
  - `name text`
  - `location text`
  - `timezone text`
  - `currency text`
  - `created_at timestamptz`
- `profiles`
  - `user_id uuid pk` (auth.users FK)
  - `farm_id uuid fk farms.id`
  - `full_name text`
  - `role text` (`super_admin|farmer|accountant|worker`)
  - `is_active boolean`

### Cage management

- `cages`
  - `id uuid pk`
  - `farm_id uuid fk`
  - `code text unique(farm_id, code)`
  - `species text`
  - `status text` (`active|maintenance|inactive`)
  - `capacity_kg numeric`
  - `created_at timestamptz`

### Devices

- `devices`
  - `id uuid pk`
  - `farm_id uuid fk`
  - `cage_id uuid fk nullable`
  - `device_uid text unique`
  - `firmware_version text`
  - `status text`
  - `last_seen_at timestamptz`

### Feeding

- `feeding_schedules`
  - `id uuid pk`
  - `farm_id uuid fk`
  - `cage_id uuid fk`
  - `mode text` (`manual|automatic|hybrid`)
  - `feed_type text`
  - `quantity_kg numeric`
  - `time_of_day time`
  - `is_paused boolean`
- `feeding_logs`
  - `id bigint identity pk`
  - `farm_id uuid fk`
  - `cage_id uuid fk`
  - `device_id uuid fk nullable`
  - `executed_at timestamptz`
  - `quantity_kg numeric`
  - `status text`
  - `motor_runtime_sec integer`
  - `trigger_source text` (`manual|schedule|ai|fallback`)

### Production

- `fish_batches`
  - `id uuid pk`
  - `farm_id uuid fk`
  - `cage_id uuid fk`
  - `species text`
  - `stocking_date date`
  - `initial_count integer`
  - `avg_weight_g numeric`
- `growth_records`
  - `id bigint identity pk`
  - `farm_id uuid fk`
  - `batch_id uuid fk`
  - `recorded_at date`
  - `avg_weight_g numeric`
  - `biomass_kg numeric`
- `mortality_records`
  - `id bigint identity pk`
  - `farm_id uuid fk`
  - `batch_id uuid fk`
  - `recorded_at date`
  - `count integer`
  - `cause text`
- `harvest_records`
  - `id bigint identity pk`
  - `farm_id uuid fk`
  - `batch_id uuid fk`
  - `harvested_at date`
  - `quantity_kg numeric`
  - `revenue numeric`

### Finance

- `finance_income`
- `finance_expenses`
- `ledger_entries`
- `payments`

### Inventory

- `inventory_items`
  - `id uuid pk`
  - `farm_id uuid fk`
  - `type text` (`feed|medicine|equipment|fuel|consumable`)
  - `name text`
  - `unit text`
  - `stock_qty numeric`
  - `reorder_level numeric`
- `inventory_movements`
  - `id bigint identity pk`
  - `farm_id uuid fk`
  - `item_id uuid fk`
  - `direction text` (`in|out|adjustment`)
  - `qty numeric`
  - `reason text`

### Alerts + reporting

- `alert_rules`
- `alert_events`
- `report_jobs`
- `report_exports`

### RLS contract (must-have)

- Every table includes `farm_id uuid not null`.
- Policies use `farm_id = (auth.jwt()->'app_metadata'->>'farm_id')::uuid`.
- No `'default'` tenant fallback in production.

---

## 3.2 Firebase contracts (realtime / IoT)

Root path:

- `/farms/{farmId}`

### Sensors

- `/farms/{farmId}/cages/{cageId}/sensors/latest`
  - `timestamp`
  - `temperature`
  - `ph`
  - `dissolved_oxygen`
  - `ammonia`
  - `nitrite`
  - `turbidity`
- `/farms/{farmId}/cages/{cageId}/sensors/history/{yyyy}/{mm}/{dd}/{eventId}`

### Device telemetry

- `/farms/{farmId}/devices/{deviceId}/status`
  - `online`
  - `last_seen`
  - `signal_strength`
  - `firmware_version`
  - `battery`

### Feeding commands + execution

- `/farms/{farmId}/commands/feeding/{commandId}`
  - `cage_id`
  - `mode`
  - `quantity_kg`
  - `issued_by`
  - `issued_at`
  - `status`
- `/farms/{farmId}/executions/feeding/{executionId}`
  - `command_id`
  - `device_id`
  - `started_at`
  - `finished_at`
  - `runtime_sec`
  - `status`

### Alerts

- `/farms/{farmId}/alerts/active/{alertId}`
  - `type`
  - `severity`
  - `message`
  - `cage_id`
  - `device_id`
  - `created_at`
  - `acknowledged`
  - `acknowledged_by`
- `/farms/{farmId}/alerts/history/{yyyy}/{mm}/{alertId}`

### Security rules contract

- Users may read/write only their `farmId` subtree (claims-based).
- Device service account writes sensor/device paths only.
- Frontend users cannot overwrite historical telemetry nodes.

---

## 4) Integration boundaries (Supabase vs Firebase)

- **Firebase**: live sensor stream, online/offline device state, immediate command queues, active alerts.
- **Supabase**: auth, tenants, financials, inventory, schedules, production records, official reports.
- **Sync jobs**: write finalized execution events, daily aggregates, and audited alerts into Supabase for reporting.

---

## 5) Phased sprint plan (Phase 1–4)

## Phase 1 — Foundation hardening (2–3 weeks)

Goals:

1. Replace localStorage auth with Supabase Auth.
2. Introduce tenant + RBAC contexts and route guards.
3. Remove hardcoded `default` farm usage from frontend clients.
4. Create shared services (`firebase/*`, `supabase/*`, `services/*`) and move existing logic.

Deliverables:

- Auth/login/register/forgot-password working with secure sessions.
- `farmId` and role resolved from JWT/profile for every request.
- Realtime alerts page uses tenant-aware Firebase path.

Exit criteria:

- No plaintext credentials in browser storage.
- No `default` tenant in code paths.
- Build + smoke tests pass.

## Phase 2 — Core commercial modules (3–4 weeks)

Goals:

1. Cage management CRUD + detail views.
2. Device monitoring page (online/offline, last seen, signal, firmware).
3. Feeding expansion: schedule CRUD, automatic/hybrid modes, logs page.
4. Inventory feed module with low-stock warnings.

Deliverables:

- Sidebar and routes aligned to enterprise map.
- Firebase command + execution contract implemented.
- Supabase tables for cages/devices/feeding_schedules/feeding_logs/inventory.

Exit criteria:

- Operator can configure and execute feeding across cages.
- Live device health visible.
- Inventory low-stock alerts visible.

## Phase 3 — ERP depth + analytics (3–4 weeks)

Goals:

1. Production modules.
2. Finance ledger/cashflow/report datasets.
3. Reports center (financial/production/water/sales) with export jobs.
4. Alert rules engine UI and history.

Deliverables:

- Production KPIs: survival, FCR, biomass, harvest estimates.
- Monthly financial views (revenue/expense/profit/cashflow).
- Historical alerts and acknowledgements.

Exit criteria:

- Cross-module reports consistent with source records.
- Auditable data trail for operations + finance.

## Phase 4 — Enterprise readiness + scale (2–3 weeks)

Goals:

1. Observability, audit logs, SLO dashboards.
2. E2E regression suite for critical workflows.
3. Performance optimization and edge caching where safe.
4. AI module integration points (recommendations + forecasting).

Deliverables:

- Sentry/logging/metrics dashboards.
- CI gates: lint, typecheck, unit, e2e, migration checks.
- Incident-ready alerts operations playbook.

Exit criteria:

- Production release checklist passed.
- Multi-farm load test baseline passed.
- Security review sign-off for tenant isolation.

---

## 6) Immediate next actions (this week)

1. Create `src/services`, `src/firebase`, `src/supabase`, `src/contexts`, `src/layouts`, `src/pages` folders and migrate current files incrementally.
2. Implement Supabase Auth migration and deprecate `src/lib/auth.ts` localStorage flow.
3. Replace hardcoded Firebase paths with `buildFarmPath(farmId, ...)` helper.
4. Add `/alerts/active` route alias and keep `/water/alerts` redirect for backward compatibility.
5. Add schema migration for `profiles`, `cages`, `devices`, `feeding_schedules`, `feeding_logs`, `inventory_items`, `inventory_movements`, `alert_events`.

This blueprint gives an executable path from current MVP to a full enterprise commercial smart aquaculture platform.
