-- Scope legacy farm_id tables to each authenticated Supabase user.
-- The frontend derives farm IDs as `user_${auth.uid()}` for authenticated users.

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
