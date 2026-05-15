# Production Deployment Checklist

## 1) Environment variables
Set all required variables from `.env.example`.

Minimum required for current app features:
- `VITE_SUPABASE_URL` or `SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` or `SUPABASE_ANON_KEY`
- `VITE_FIREBASE_DATABASE_URL` or `FIREBASE_DATABASE_URL`

Optional but recommended:
- `JWT_SECRET`
- `IOT_INGEST_TOKEN`
- Firebase Admin vars for server-side sync

## 2) Supabase setup
1. Run `supabase/schema.sql`.
2. Run `supabase/rls-policies.sql`.
3. Ensure JWT includes `app_metadata.farm_id` for multi-tenant isolation.
4. Ensure application flow always supplies an explicit `farm_id` on writes.

## 3) Firebase Realtime Database
1. Apply `firebase/database.rules.json`.
2. Ensure auth tokens include:
   - `device: true` for sensor/device writes
   - `admin: true` for admin writes
3. Confirm RTDB URL matches `VITE_FIREBASE_DATABASE_URL`.

## 4) Cloudflare deployment
1. Confirm `wrangler.jsonc` is valid for your account/project.
2. Configure secrets/vars in Cloudflare dashboard or wrangler.
3. Build and deploy.

## 5) Health checks
Use:
- `GET /api/health/env` for environment sanity check.

A healthy response returns `ok: true` with no missing required vars.


## 6) Auth provisioning hardening (required)
1. Ensure every non-admin user has `app_metadata.farm_id` before first app access.
2. Provision this during signup/admin-created users via Admin API / Edge Function / backend sync.
3. Run `supabase/tenant-provisioning-and-backfill.sql` for audit/backfill tasks.
4. Do not rely on implicit/default tenant IDs; bootstrap farms are user-created in dashboard.

## 7) Access control behavior
- RLS now rejects non-admin users that do not have a JWT `app_metadata.farm_id` claim.
- Admin access is controlled by JWT `app_metadata.admin = true`.
