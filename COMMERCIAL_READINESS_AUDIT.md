# Commercial Readiness Audit (May 20, 2026)

## Scope reviewed

- Frontend routes/components under `src/routes` and `src/components/dashboard`.
- Data access/auth modules under `src/lib`.
- Backend schema/policies/bootstrap data under `supabase` and `firebase`.

## Critical findings

1. **Authentication is demo-grade and insecure (localStorage plaintext passwords).**
   - `src/lib/auth.ts` stores user records and plaintext passwords in browser localStorage.
   - No server-side auth, no password hashing, no session tokens, no expiry.

2. **Frontend is partially connected to backend; dashboard still uses synthetic/default data.**
   - Live data calls exist for Supabase and Firebase in `src/lib/platform-clients.ts`.
   - But `src/components/dashboard/water-monitoring.tsx` generates pseudo-random time-series and does not call backend data.
   - `src/components/dashboard/feeding-schedule.tsx` is fully hardcoded with static rows.
   - `src/routes/feeding/manual.tsx` shows hardcoded “Recent Manual Feeds”.

3. **Single-tenant default identifiers are hardcoded in production paths.**
   - Firebase paths are hardcoded to `/farms/default/ponds/pond-a/...` in `src/lib/platform-clients.ts`.
   - Supabase schema defaults `farm_id` to `'default'` in `supabase/schema.sql`.
   - RLS policy fallback to `'default'` in `supabase/rls-policies.sql` can leak data grouping and encourages bootstrap tenant coupling.

4. **Business status widgets contain fabricated operational data.**
   - `src/components/dashboard/status-bar.tsx` hardcodes `Devices Online: 5/5` and weather/location (`Kisumu, 28°C`).
   - This is not acceptable for a commercial “truthful telemetry” system unless clearly labeled as static.

## High-priority risks

- **Compliance/security risk:** Storing credentials in localStorage may violate baseline security requirements.
- **Data integrity risk:** Hardcoded tenant/pond IDs create cross-customer data contamination risk.
- **Operational trust risk:** Dashboard presents simulated/placeholder telemetry as “Live”.

## Immediate remediation plan (recommended)

1. Replace `src/lib/auth.ts` with real auth provider (Supabase Auth/Auth0/Cognito) and hashed passwords.
2. Remove `'default'` fallbacks from schema/policies and enforce farm_id from authenticated JWT claims.
3. Replace synthetic dashboard modules with API-backed queries (or clearly flag as “No data yet”).
4. Parameterize pond/farm selection in all writes/reads (manual feed + water endpoints).
5. Add end-to-end tests for data write/read flow and tenant isolation.

## Evidence of backend wiring that _does_ exist

- Supabase CRUD exists for income/expenses/feeding events in `src/lib/platform-clients.ts`.
- Firebase realtime read/write exists for latest water and feeding events in `src/lib/platform-clients.ts`.
- Build succeeds (`npm run build`), so the current code is syntactically deployable but not yet commercially production-ready.
