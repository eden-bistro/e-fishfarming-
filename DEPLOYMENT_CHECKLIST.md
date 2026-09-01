# Production Deployment Checklist

## 1) Environment variables

Set all required variables from `.env.example`.

Minimum required for current app features:

- `VITE_SUPABASE_URL` or `SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` or `SUPABASE_ANON_KEY`
- `VITE_FIREBASE_DATABASE_URL` or `FIREBASE_DATABASE_URL`

Optional but recommended:

- `JWT_SECRET`

Required for AquaSmart AI:

- `OPENAI_API_KEY` as a server-side secret (never use a `VITE_` prefix)
- Optional: `OPENAI_MODEL` to select the approved production model; the app defaults to `gpt-4.1-mini`

Required for ESP32 ingest:

- `IOT_INGEST_TOKEN`
- `FIREBASE_SERVICE_ACCOUNT` for authenticated server-side RTDB writes, or legacy `FIREBASE_DATABASE_SECRET` / `FIREBASE_AUTH_TOKEN`

## 2) Supabase setup

1. Create or select a Supabase project.
2. Link the repo with `supabase link --project-ref <your-project-ref>`.
3. Preview the migration with `supabase db push --dry-run`.
4. Apply `supabase/migrations/20260529103000_initial_aquasmart_schema.sql` with `supabase db push`.
5. Ensure JWT includes `app_metadata.farm_id` for multi-tenant isolation on finance/IoT tables.
6. For initial bootstrap/testing, default farm id is `default`.

## 3) Firebase Realtime Database

1. Apply `firebase/database.rules.json` manually or let GitHub Actions deploy it from `firebase.json`.
2. For GitHub deployment, add repository secrets:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_SERVICE_ACCOUNT_JSON`
3. Ensure direct Firebase device tokens include:
   - `device: true` for sensor/device writes
   - `admin: true` for admin writes
4. For backend ESP32 ingest, configure `IOT_INGEST_TOKEN` and one server-side Firebase write-auth option.
5. Confirm RTDB URL matches `FIREBASE_DATABASE_URL`.

## 5) Cloudflare deployment

1. Confirm `wrangler.jsonc` is valid for your account/project.
2. For GitHub deployment, add repository secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
3. Configure durable runtime variables/secrets in Cloudflare. Prefer the server-style names below because the Supabase auth proxy reads them at Worker runtime:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `FIREBASE_DATABASE_URL`
   - `IOT_INGEST_TOKEN`
   - `FIREBASE_SERVICE_ACCOUNT` (or legacy `FIREBASE_DATABASE_SECRET` / `FIREBASE_AUTH_TOKEN`)
   - `OPENAI_API_KEY`
   - Optional: `OPENAI_MODEL`
4. Click path (Pages): `Workers & Pages` -> your Pages project -> `Settings` -> `Environment variables` -> add variables in both Preview and Production -> redeploy.
5. Click path (Workers): `Workers & Pages` -> your Worker -> `Settings` -> `Variables` -> add environment variables -> deploy new version.
6. Build and deploy locally or let `.github/workflows/cloudflare-deploy.yml` deploy from `main`.

## 6) Health checks

Use:

- `GET /api/health/env` for environment sanity check.

A healthy response returns `ok: true` with no missing required vars. If Supabase auth says it is not configured after an offline/online cycle, check this endpoint first; the fix is to restore `SUPABASE_URL` and `SUPABASE_ANON_KEY` on the deployed Cloudflare Worker, not only in your local `.env` file.

## 7) IoT troubleshooting

See `IOT_TROUBLESHOOTING.md` for production debugging steps.
