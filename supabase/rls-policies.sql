-- Enable RLS
alter table if exists public.finance_income enable row level security;
alter table if exists public.finance_expenses enable row level security;
alter table if exists public.feeding_events enable row level security;
alter table if exists public.water_readings enable row level security;

-- Multi-tenant scope: each authenticated user only accesses their farm.
-- Requires JWT claim: app_metadata.farm_id
-- Access expression:
-- coalesce(auth.jwt() -> 'app_metadata' ->> 'farm_id', 'default')

create policy if not exists "finance_income_select" on finance_income
for select using (farm_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'farm_id', 'default'));
create policy if not exists "finance_income_insert" on finance_income
for insert with check (farm_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'farm_id', 'default'));
create policy if not exists "finance_income_update" on finance_income
for update using (farm_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'farm_id', 'default'))
with check (farm_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'farm_id', 'default'));
create policy if not exists "finance_income_delete" on finance_income
for delete using (farm_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'farm_id', 'default'));

create policy if not exists "finance_expenses_select" on finance_expenses
for select using (farm_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'farm_id', 'default'));
create policy if not exists "finance_expenses_insert" on finance_expenses
for insert with check (farm_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'farm_id', 'default'));
create policy if not exists "finance_expenses_update" on finance_expenses
for update using (farm_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'farm_id', 'default'))
with check (farm_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'farm_id', 'default'));
create policy if not exists "finance_expenses_delete" on finance_expenses
for delete using (farm_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'farm_id', 'default'));

create policy if not exists "feeding_events_select" on feeding_events
for select using (farm_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'farm_id', 'default'));
create policy if not exists "feeding_events_insert" on feeding_events
for insert with check (farm_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'farm_id', 'default'));

create policy if not exists "water_readings_select" on water_readings
for select using (farm_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'farm_id', 'default'));
create policy if not exists "water_readings_insert" on water_readings
for insert with check (farm_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'farm_id', 'default'));
