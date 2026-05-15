-- Enable RLS
alter table if exists public.finance_income enable row level security;
alter table if exists public.finance_expenses enable row level security;
alter table if exists public.feeding_events enable row level security;
alter table if exists public.water_readings enable row level security;

-- Multi-tenant scope:
-- - Non-admin users must have JWT app_metadata.farm_id and can only access matching farm_id rows.
-- - Admin users may access all rows.
-- Bootstrap note:
-- - Table defaults may still insert farm_id='default'. Keep this only for temporary bootstrap data.

DO $do$
DECLARE
  tenant_expr text := 'nullif(auth.jwt() -> ''app_metadata'' ->> ''farm_id'', '''')';
  admin_expr text := 'coalesce((auth.jwt() -> ''app_metadata'' ->> ''admin'')::boolean, false)';
BEGIN
  -- finance_income
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'finance_income' AND policyname = 'finance_income_select'
  ) THEN
    EXECUTE format(
      'create policy %I on public.finance_income for select using ((%s) OR farm_id = %s)',
      'finance_income_select', admin_expr, tenant_expr
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'finance_income' AND policyname = 'finance_income_insert'
  ) THEN
    EXECUTE format(
      'create policy %I on public.finance_income for insert with check ((%s) OR farm_id = %s)',
      'finance_income_insert', admin_expr, tenant_expr
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'finance_income' AND policyname = 'finance_income_update'
  ) THEN
    EXECUTE format(
      'create policy %I on public.finance_income for update using ((%s) OR farm_id = %s) with check ((%s) OR farm_id = %s)',
      'finance_income_update', admin_expr, tenant_expr, admin_expr, tenant_expr
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'finance_income' AND policyname = 'finance_income_delete'
  ) THEN
    EXECUTE format(
      'create policy %I on public.finance_income for delete using ((%s) OR farm_id = %s)',
      'finance_income_delete', admin_expr, tenant_expr
    );
  END IF;

  -- finance_expenses
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'finance_expenses' AND policyname = 'finance_expenses_select'
  ) THEN
    EXECUTE format(
      'create policy %I on public.finance_expenses for select using ((%s) OR farm_id = %s)',
      'finance_expenses_select', admin_expr, tenant_expr
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'finance_expenses' AND policyname = 'finance_expenses_insert'
  ) THEN
    EXECUTE format(
      'create policy %I on public.finance_expenses for insert with check ((%s) OR farm_id = %s)',
      'finance_expenses_insert', admin_expr, tenant_expr
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'finance_expenses' AND policyname = 'finance_expenses_update'
  ) THEN
    EXECUTE format(
      'create policy %I on public.finance_expenses for update using ((%s) OR farm_id = %s) with check ((%s) OR farm_id = %s)',
      'finance_expenses_update', admin_expr, tenant_expr, admin_expr, tenant_expr
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'finance_expenses' AND policyname = 'finance_expenses_delete'
  ) THEN
    EXECUTE format(
      'create policy %I on public.finance_expenses for delete using ((%s) OR farm_id = %s)',
      'finance_expenses_delete', admin_expr, tenant_expr
    );
  END IF;

  -- feeding_events
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'feeding_events' AND policyname = 'feeding_events_select'
  ) THEN
    EXECUTE format(
      'create policy %I on public.feeding_events for select using ((%s) OR farm_id = %s)',
      'feeding_events_select', admin_expr, tenant_expr
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'feeding_events' AND policyname = 'feeding_events_insert'
  ) THEN
    EXECUTE format(
      'create policy %I on public.feeding_events for insert with check ((%s) OR farm_id = %s)',
      'feeding_events_insert', admin_expr, tenant_expr
    );
  END IF;

  -- water_readings
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'water_readings' AND policyname = 'water_readings_select'
  ) THEN
    EXECUTE format(
      'create policy %I on public.water_readings for select using ((%s) OR farm_id = %s)',
      'water_readings_select', admin_expr, tenant_expr
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'water_readings' AND policyname = 'water_readings_insert'
  ) THEN
    EXECUTE format(
      'create policy %I on public.water_readings for insert with check ((%s) OR farm_id = %s)',
      'water_readings_insert', admin_expr, tenant_expr
    );
  END IF;
END
$do$;

-- Harden existing views to avoid SECURITY DEFINER bypassing caller RLS context.
DO $do$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_views
    WHERE schemaname = 'public' AND viewname = 'farmer_profit'
  ) THEN
    EXECUTE 'alter view public.farmer_profit set (security_invoker = true)';
  END IF;
END
$do$;
