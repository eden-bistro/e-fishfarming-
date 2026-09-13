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

- `AI_API_KEY` as a **server-side Cloudflare Worker secret** (never use a `VITE_` prefix). This is a Groq API key and must not be added to `.env` in Git, React code, or client-side JavaScript.
- `AI_PROVIDER=groq` as a non-secret Worker variable. Groq is used through its OpenAI-compatible HTTPS chat-completions API, so no provider SDK is required in the Worker.
- Optional non-secret `AI_MODEL` to select the approved model; the app defaults to `llama-3.3-70b-versatile`.

Groq's development free tier is suitable for development and testing but has provider-managed request/token rate limits and model availability. Configure monitoring and a paid plan or alternate approved provider before depending on it for high-volume production traffic.

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
2. **GitHub Actions deployment secrets** — add these repository secrets so GitHub Actions and Wrangler can deploy the Worker. They are not Worker runtime bindings:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
     Without either secret, the workflow still builds, typechecks, and tests the application, then reports a successful deployment skip.
3. **AquaSmart Worker runtime configuration** — configure these separately in the deployed Cloudflare Worker. Prefer the server-style names below because the Supabase auth proxy reads them at Worker runtime:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `FIREBASE_DATABASE_URL`
   - `IOT_INGEST_TOKEN`
   - `FIREBASE_SERVICE_ACCOUNT` (or legacy `FIREBASE_DATABASE_SECRET` / `FIREBASE_AUTH_TOKEN`)
   - `AI_API_KEY` (**secret**)
   - `AI_PROVIDER=groq` (variable)
   - Optional: `AI_MODEL` (variable)
4. Click path (Pages): `Workers & Pages` -> your Pages project -> `Settings` -> `Environment variables` -> add variables in both Preview and Production -> redeploy.
5. Click path (Workers): `Workers & Pages` -> your Worker -> `Settings` -> `Variables` -> add environment variables -> deploy new version.
6. Build and deploy locally or let `.github/workflows/cloudflare-deploy.yml` deploy from `main`.

## 6) Health checks

Use:

- `GET /api/health/env` for environment sanity check.

A healthy response returns `ok: true` with no missing required vars. If Supabase auth says it is not configured after an offline/online cycle, check this endpoint first; the fix is to restore `SUPABASE_URL` and `SUPABASE_ANON_KEY` on the deployed Cloudflare Worker, not only in your local `.env` file.

## 7) IoT troubleshooting

See `IOT_TROUBLESHOOTING.md` for production debugging steps.
