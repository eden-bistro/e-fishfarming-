-- Enable RLS
alter table if exists public.finance_income enable row level security;
alter table if exists public.finance_expenses enable row level security;
alter table if exists public.feeding_events enable row level security;
alter table if exists public.water_readings enable row level security;
alter table if exists public.production_events enable row level security;
alter table if exists public.farm_profiles enable row level security;
alter table if exists public.inventory_items enable row level security;
alter table if exists public.inventory_movements enable row level security;
alter table if exists public.cages enable row level security;
alter table if exists public.hatchery_brooders enable row level security;
alter table if exists public.hatchery_fingerling_batches enable row level security;

-- Multi-tenant scope: each authenticated user only accesses their farm.
-- Older finance/IoT tables are scoped by farm_id derived from auth.uid().
-- Newer enterprise module tables are scoped by tenant_id and match backend-store tenantId(),
-- which uses the authenticated user's id.

create or replace function public.current_user_farm_id()
returns text
language sql
stable
as $$
  select case
    when auth.uid() is null then null
    else 'user_' || lower(auth.uid()::text)
  end
$$;

drop policy if exists "finance_income_select" on finance_income;
create policy "finance_income_select" on finance_income
for select using (farm_id = public.current_user_farm_id());
drop policy if exists "finance_income_insert" on finance_income;
create policy "finance_income_insert" on finance_income
for insert with check (farm_id = public.current_user_farm_id());
drop policy if exists "finance_income_update" on finance_income;
create policy "finance_income_update" on finance_income
for update using (farm_id = public.current_user_farm_id())
with check (farm_id = public.current_user_farm_id());
drop policy if exists "finance_income_delete" on finance_income;
create policy "finance_income_delete" on finance_income
for delete using (farm_id = public.current_user_farm_id());

drop policy if exists "finance_expenses_select" on finance_expenses;
create policy "finance_expenses_select" on finance_expenses
for select using (farm_id = public.current_user_farm_id());
drop policy if exists "finance_expenses_insert" on finance_expenses;
create policy "finance_expenses_insert" on finance_expenses
for insert with check (farm_id = public.current_user_farm_id());
drop policy if exists "finance_expenses_update" on finance_expenses;
create policy "finance_expenses_update" on finance_expenses
for update using (farm_id = public.current_user_farm_id())
with check (farm_id = public.current_user_farm_id());
drop policy if exists "finance_expenses_delete" on finance_expenses;
create policy "finance_expenses_delete" on finance_expenses
for delete using (farm_id = public.current_user_farm_id());

drop policy if exists "feeding_events_select" on feeding_events;
create policy "feeding_events_select" on feeding_events
for select using (farm_id = public.current_user_farm_id());
drop policy if exists "feeding_events_insert" on feeding_events;
create policy "feeding_events_insert" on feeding_events
for insert with check (farm_id = public.current_user_farm_id());

drop policy if exists "water_readings_select" on water_readings;
create policy "water_readings_select" on water_readings
for select using (farm_id = public.current_user_farm_id());
drop policy if exists "water_readings_insert" on water_readings;
create policy "water_readings_insert" on water_readings
for insert with check (farm_id = public.current_user_farm_id());


drop policy if exists "farm_profiles_select" on farm_profiles;
create policy "farm_profiles_select" on farm_profiles
for select using (tenant_id = auth.uid()::text);
drop policy if exists "farm_profiles_insert" on farm_profiles;
create policy "farm_profiles_insert" on farm_profiles
for insert with check (tenant_id = auth.uid()::text);
drop policy if exists "farm_profiles_update" on farm_profiles;
create policy "farm_profiles_update" on farm_profiles
for update using (tenant_id = auth.uid()::text)
with check (tenant_id = auth.uid()::text);
drop policy if exists "farm_profiles_delete" on farm_profiles;
create policy "farm_profiles_delete" on farm_profiles
for delete using (tenant_id = auth.uid()::text);

create policy if not exists "production_events_select" on production_events
for select using (tenant_id = auth.uid()::text);
create policy if not exists "production_events_insert" on production_events
for insert with check (tenant_id = auth.uid()::text);

create policy if not exists "inventory_items_select" on inventory_items
for select using (tenant_id = auth.uid()::text);
create policy if not exists "inventory_items_insert" on inventory_items
for insert with check (tenant_id = auth.uid()::text);
create policy if not exists "inventory_items_update" on inventory_items
for update using (tenant_id = auth.uid()::text)
with check (tenant_id = auth.uid()::text);
create policy if not exists "inventory_items_delete" on inventory_items
for delete using (tenant_id = auth.uid()::text);

create policy if not exists "inventory_movements_select" on inventory_movements
for select using (tenant_id = auth.uid()::text);
create policy if not exists "inventory_movements_insert" on inventory_movements
for insert with check (tenant_id = auth.uid()::text);

create policy if not exists "cages_select" on cages
for select using (tenant_id = auth.uid()::text);
create policy if not exists "cages_insert" on cages
for insert with check (tenant_id = auth.uid()::text);
create policy if not exists "cages_update" on cages
for update using (tenant_id = auth.uid()::text)
with check (tenant_id = auth.uid()::text);
create policy if not exists "cages_delete" on cages
for delete using (tenant_id = auth.uid()::text);

create policy if not exists "hatchery_brooders_select" on hatchery_brooders
for select using (tenant_id = auth.uid()::text);
create policy if not exists "hatchery_brooders_insert" on hatchery_brooders
for insert with check (tenant_id = auth.uid()::text);
create policy if not exists "hatchery_brooders_update" on hatchery_brooders
for update using (tenant_id = auth.uid()::text)
with check (tenant_id = auth.uid()::text);
create policy if not exists "hatchery_brooders_delete" on hatchery_brooders
for delete using (tenant_id = auth.uid()::text);

create policy if not exists "hatchery_fingerling_batches_select" on hatchery_fingerling_batches
for select using (tenant_id = auth.uid()::text);
create policy if not exists "hatchery_fingerling_batches_insert" on hatchery_fingerling_batches
for insert with check (tenant_id = auth.uid()::text);
create policy if not exists "hatchery_fingerling_batches_update" on hatchery_fingerling_batches
for update using (tenant_id = auth.uid()::text)
with check (tenant_id = auth.uid()::text);
create policy if not exists "hatchery_fingerling_batches_delete" on hatchery_fingerling_batches
for delete using (tenant_id = auth.uid()::text);
