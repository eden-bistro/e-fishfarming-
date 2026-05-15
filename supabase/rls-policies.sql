-- Enable RLS
alter table if exists public.finance_income enable row level security;
alter table if exists public.finance_expenses enable row level security;
alter table if exists public.feeding_events enable row level security;
alter table if exists public.water_readings enable row level security;

-- Multi-tenant scope: each authenticated user only accesses their farm.
-- Requires JWT claim: app_metadata.farm_id
-- If missing, this falls back to 'default'.

DO $do$
DECLARE
  tenant_expr text := 'coalesce(auth.jwt() -> ''app_metadata'' ->> ''farm_id'', ''default'')';
BEGIN
  -- finance_income
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'finance_income' AND policyname = 'finance_income_select'
  ) THEN
    EXECUTE format(
      'create policy %I on public.finance_income for select using (farm_id = %s)',
      'finance_income_select', tenant_expr
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'finance_income' AND policyname = 'finance_income_insert'
  ) THEN
    EXECUTE format(
      'create policy %I on public.finance_income for insert with check (farm_id = %s)',
      'finance_income_insert', tenant_expr
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'finance_income' AND policyname = 'finance_income_update'
  ) THEN
    EXECUTE format(
      'create policy %I on public.finance_income for update using (farm_id = %s) with check (farm_id = %s)',
      'finance_income_update', tenant_expr, tenant_expr
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'finance_income' AND policyname = 'finance_income_delete'
  ) THEN
    EXECUTE format(
      'create policy %I on public.finance_income for delete using (farm_id = %s)',
      'finance_income_delete', tenant_expr
    );
  END IF;

  -- finance_expenses
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'finance_expenses' AND policyname = 'finance_expenses_select'
  ) THEN
    EXECUTE format(
      'create policy %I on public.finance_expenses for select using (farm_id = %s)',
      'finance_expenses_select', tenant_expr
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'finance_expenses' AND policyname = 'finance_expenses_insert'
  ) THEN
    EXECUTE format(
      'create policy %I on public.finance_expenses for insert with check (farm_id = %s)',
      'finance_expenses_insert', tenant_expr
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'finance_expenses' AND policyname = 'finance_expenses_update'
  ) THEN
    EXECUTE format(
      'create policy %I on public.finance_expenses for update using (farm_id = %s) with check (farm_id = %s)',
      'finance_expenses_update', tenant_expr, tenant_expr
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'finance_expenses' AND policyname = 'finance_expenses_delete'
  ) THEN
    EXECUTE format(
      'create policy %I on public.finance_expenses for delete using (farm_id = %s)',
      'finance_expenses_delete', tenant_expr
    );
  END IF;

  -- feeding_events
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'feeding_events' AND policyname = 'feeding_events_select'
  ) THEN
    EXECUTE format(
      'create policy %I on public.feeding_events for select using (farm_id = %s)',
      'feeding_events_select', tenant_expr
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'feeding_events' AND policyname = 'feeding_events_insert'
  ) THEN
    EXECUTE format(
      'create policy %I on public.feeding_events for insert with check (farm_id = %s)',
      'feeding_events_insert', tenant_expr
    );
  END IF;

  -- water_readings
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'water_readings' AND policyname = 'water_readings_select'
  ) THEN
    EXECUTE format(
      'create policy %I on public.water_readings for select using (farm_id = %s)',
      'water_readings_select', tenant_expr
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'water_readings' AND policyname = 'water_readings_insert'
  ) THEN
    EXECUTE format(
      'create policy %I on public.water_readings for insert with check (farm_id = %s)',
      'water_readings_insert', tenant_expr
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
