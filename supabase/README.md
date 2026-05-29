# AquaSmart Supabase setup

This directory contains the database definition for creating a fresh Supabase project for the AquaSmart fish-farming app.

## Create a new Supabase project from this repo

1. Create a new project in the Supabase dashboard.
2. Install or run the Supabase CLI with Node.js 20+.
3. Authenticate and link this repo to the new project:

   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   ```

4. Preview the migration that will be applied:

   ```bash
   supabase db push --dry-run
   ```

5. Apply the schema and RLS policies:

   ```bash
   supabase db push
   ```

6. Copy the generated API settings into the deployment environment:

   ```text
   VITE_SUPABASE_URL=<project-api-url>
   VITE_SUPABASE_ANON_KEY=<project-anon-key>
   SUPABASE_URL=<project-api-url>
   SUPABASE_ANON_KEY=<project-anon-key>
   ```

7. In Supabase Auth, disable email confirmation for demo/instant registration or configure email SMTP and confirmation redirects for production.

## Included database objects

The initial migration creates:

- IoT + operations tables: `feeding_events`, `water_readings`
- Finance tables: `finance_income`, `finance_expenses`
- Enterprise production tables: `production_events`, `cages`
- Inventory tables: `inventory_items`, `inventory_movements`
- Hatchery tables: `hatchery_brooders`, `hatchery_fingerling_batches`
- Indexes for tenant/time/category/status lookup patterns
- Row-level security policies for tenant-scoped access

## Notes

- `supabase/schema.sql` and `supabase/rls-policies.sql` are kept as readable source files.
- `supabase/migrations/20260529103000_initial_aquasmart_schema.sql` is the migration file used by the Supabase CLI for a fresh project.
- The finance and IoT tables use `farm_id` policies based on the `app_metadata.farm_id` JWT claim.
- The enterprise module tables use `tenant_id = auth.uid()::text`, matching `src/services/modules/backend-store.ts`.
