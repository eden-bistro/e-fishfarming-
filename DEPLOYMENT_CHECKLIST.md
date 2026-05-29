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
- `FIREBASE_DATABASE_SECRET` (or `FIREBASE_AUTH_TOKEN`) for authenticated server-side RTDB writes
- Firebase Admin vars for server-side sync

## 2) GitHub Actions integration

The repo is wired for GitHub-hosted validation and deployment:

- `.github/workflows/ci.yml` runs linting, type-checking, tests, and the production build for pull requests and `main`.
- `.github/workflows/supabase-db.yml` validates Supabase SQL on pull requests and pushes migrations to Supabase from `main` or manual dispatch.
- `.github/workflows/firebase-rtdb-rules.yml` validates and deploys Firebase Realtime Database rules.
- `.github/workflows/cloudflare-deploy.yml` builds the web application and deploys the Worker with Wrangler.

## 3) Supabase setup

1. Create or select a Supabase project.
2. Link the repo with `supabase link --project-ref <your-project-ref>`.
3. Preview the migration with `supabase db push --dry-run`.
4. Apply `supabase/migrations/20260529103000_initial_aquasmart_schema.sql` with `supabase db push`, or let GitHub Actions push migrations after configuring secrets.
5. For GitHub deployment, add repository secrets:
   - `SUPABASE_ACCESS_TOKEN`
   - `SUPABASE_DB_PASSWORD`
   - `SUPABASE_PROJECT_REF`
6. Ensure JWT includes `app_metadata.farm_id` for multi-tenant isolation on finance/IoT tables.
7. For initial bootstrap/testing, default farm id is `default`.

## 4) Firebase Realtime Database

1. Apply `firebase/database.rules.json` manually or let GitHub Actions deploy it from `firebase.json`.
2. For GitHub deployment, add repository secrets:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_SERVICE_ACCOUNT_JSON`
3. Ensure auth tokens include:
   - `device: true` for sensor/device writes
   - `admin: true` for admin writes
4. Confirm RTDB URL matches `FIREBASE_DATABASE_URL`.

## 5) Cloudflare deployment

1. Confirm `wrangler.jsonc` is valid for your account/project.
2. For GitHub deployment, add repository secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
3. Configure env vars in Cloudflare dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `FIREBASE_DATABASE_URL`
4. Click path (Pages): `Workers & Pages` -> your Pages project -> `Settings` -> `Environment variables` -> add variables in both Preview and Production -> redeploy.
5. Click path (Workers): `Workers & Pages` -> your Worker -> `Settings` -> `Variables` -> add environment variables -> deploy new version.
6. Build and deploy locally or let `.github/workflows/cloudflare-deploy.yml` deploy from `main`.

## 6) Health checks

Use:

- `GET /api/health/env` for environment sanity check.

A healthy response returns `ok: true` with no missing required vars.

## 7) IoT troubleshooting

See `IOT_TROUBLESHOOTING.md` for production debugging steps.
