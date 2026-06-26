-- Secure role-based administration for AquaSmart.
-- Roles are intentionally enforced in PostgreSQL helper functions/RLS and mirrored in
-- server route guards for Firebase-backed IoT device management.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'farm_user' check (role in ('admin', 'farm_user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.profiles (id, email, role)
select id, email, case when lower(email) = 'fishhydro1@gmail.com' then 'admin' else 'farm_user' end
from auth.users
on conflict (id) do update
set email = excluded.email,
    role = case when lower(excluded.email) = 'fishhydro1@gmail.com' then 'admin' else public.profiles.role end,
    updated_at = now();

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then null
    when lower(coalesce(auth.jwt() ->> 'email', '')) = 'fishhydro1@gmail.com' then 'admin'
    else coalesce((select p.role from public.profiles p where p.id = auth.uid()), 'farm_user')
  end
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'admin'
$$;

create table if not exists public.device_settings (
  id bigserial primary key,
  farm_id text not null,
  pond_id text not null,
  device_id text not null,
  lifecycle_status text not null default 'assigned' check (lifecycle_status in ('assigned', 'active', 'maintenance', 'retired')),
  settings jsonb not null default '{}'::jsonb,
  assigned_to uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, pond_id, device_id)
);

create index if not exists idx_device_settings_farm on public.device_settings (farm_id, pond_id);
create index if not exists idx_device_settings_updated on public.device_settings (updated_at desc);

alter table public.profiles enable row level security;
alter table public.device_settings enable row level security;

-- Profiles: admins can review users; farm users can read their own profile. Role writes are admin-only.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_insert_admin" on public.profiles;
create policy "profiles_insert_admin" on public.profiles
for insert with check (public.is_admin());

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin" on public.profiles
for delete using (public.is_admin());

-- Admins can manage device configuration. Farm users may read device settings for their own farm,
-- but cannot insert/update/delete configuration rows.
drop policy if exists "device_settings_select" on public.device_settings;
create policy "device_settings_select" on public.device_settings
for select using (public.is_admin() or farm_id = public.current_user_farm_id());

drop policy if exists "device_settings_insert_admin" on public.device_settings;
create policy "device_settings_insert_admin" on public.device_settings
for insert with check (public.is_admin());

drop policy if exists "device_settings_update_admin" on public.device_settings;
create policy "device_settings_update_admin" on public.device_settings
for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "device_settings_delete_admin" on public.device_settings;
create policy "device_settings_delete_admin" on public.device_settings
for delete using (public.is_admin());

-- Extend existing farm isolation without weakening it: farm users remain owner-scoped,
-- admins gain cross-farm visibility/management.
drop policy if exists "farm_profiles_select" on public.farm_profiles;
create policy "farm_profiles_select" on public.farm_profiles
for select using (tenant_id = auth.uid()::text or public.is_admin());

drop policy if exists "farm_profiles_insert" on public.farm_profiles;
create policy "farm_profiles_insert" on public.farm_profiles
for insert with check (tenant_id = auth.uid()::text or public.is_admin());

drop policy if exists "farm_profiles_update" on public.farm_profiles;
create policy "farm_profiles_update" on public.farm_profiles
for update using (tenant_id = auth.uid()::text or public.is_admin())
with check (tenant_id = auth.uid()::text or public.is_admin());

drop policy if exists "farm_profiles_delete" on public.farm_profiles;
create policy "farm_profiles_delete" on public.farm_profiles
for delete using (tenant_id = auth.uid()::text or public.is_admin());

-- Legacy farm_id tables: preserve own-farm access while adding admin cross-farm access.
drop policy if exists "feeding_events_select" on public.feeding_events;
create policy "feeding_events_select" on public.feeding_events
for select using (farm_id = public.current_user_farm_id() or public.is_admin());

drop policy if exists "feeding_events_insert" on public.feeding_events;
create policy "feeding_events_insert" on public.feeding_events
for insert with check (farm_id = public.current_user_farm_id() or public.is_admin());

drop policy if exists "water_readings_select" on public.water_readings;
create policy "water_readings_select" on public.water_readings
for select using (farm_id = public.current_user_farm_id() or public.is_admin());

drop policy if exists "water_readings_insert" on public.water_readings;
create policy "water_readings_insert" on public.water_readings
for insert with check (farm_id = public.current_user_farm_id() or public.is_admin());

drop policy if exists "finance_income_select" on public.finance_income;
create policy "finance_income_select" on public.finance_income
for select using (farm_id = public.current_user_farm_id() or public.is_admin());

drop policy if exists "finance_income_insert" on public.finance_income;
create policy "finance_income_insert" on public.finance_income
for insert with check (farm_id = public.current_user_farm_id() or public.is_admin());

drop policy if exists "finance_income_update" on public.finance_income;
create policy "finance_income_update" on public.finance_income
for update using (farm_id = public.current_user_farm_id() or public.is_admin())
with check (farm_id = public.current_user_farm_id() or public.is_admin());

drop policy if exists "finance_income_delete" on public.finance_income;
create policy "finance_income_delete" on public.finance_income
for delete using (farm_id = public.current_user_farm_id() or public.is_admin());

drop policy if exists "finance_expenses_select" on public.finance_expenses;
create policy "finance_expenses_select" on public.finance_expenses
for select using (farm_id = public.current_user_farm_id() or public.is_admin());

drop policy if exists "finance_expenses_insert" on public.finance_expenses;
create policy "finance_expenses_insert" on public.finance_expenses
for insert with check (farm_id = public.current_user_farm_id() or public.is_admin());

drop policy if exists "finance_expenses_update" on public.finance_expenses;
create policy "finance_expenses_update" on public.finance_expenses
for update using (farm_id = public.current_user_farm_id() or public.is_admin())
with check (farm_id = public.current_user_farm_id() or public.is_admin());

drop policy if exists "finance_expenses_delete" on public.finance_expenses;
create policy "finance_expenses_delete" on public.finance_expenses
for delete using (farm_id = public.current_user_farm_id() or public.is_admin());

-- Tenant-id enterprise module tables: own tenant for farm users, cross-tenant for admins.
drop policy if exists "production_events_select" on public.production_events;
create policy "production_events_select" on public.production_events
for select using (tenant_id = auth.uid()::text or public.is_admin());

drop policy if exists "production_events_insert" on public.production_events;
create policy "production_events_insert" on public.production_events
for insert with check (tenant_id = auth.uid()::text or public.is_admin());

drop policy if exists "inventory_items_select" on public.inventory_items;
create policy "inventory_items_select" on public.inventory_items
for select using (tenant_id = auth.uid()::text or public.is_admin());

drop policy if exists "inventory_items_insert" on public.inventory_items;
create policy "inventory_items_insert" on public.inventory_items
for insert with check (tenant_id = auth.uid()::text or public.is_admin());

drop policy if exists "inventory_items_update" on public.inventory_items;
create policy "inventory_items_update" on public.inventory_items
for update using (tenant_id = auth.uid()::text or public.is_admin())
with check (tenant_id = auth.uid()::text or public.is_admin());

drop policy if exists "inventory_items_delete" on public.inventory_items;
create policy "inventory_items_delete" on public.inventory_items
for delete using (tenant_id = auth.uid()::text or public.is_admin());

drop policy if exists "inventory_movements_select" on public.inventory_movements;
create policy "inventory_movements_select" on public.inventory_movements
for select using (tenant_id = auth.uid()::text or public.is_admin());

drop policy if exists "inventory_movements_insert" on public.inventory_movements;
create policy "inventory_movements_insert" on public.inventory_movements
for insert with check (tenant_id = auth.uid()::text or public.is_admin());

drop policy if exists "cages_select" on public.cages;
create policy "cages_select" on public.cages
for select using (tenant_id = auth.uid()::text or public.is_admin());

drop policy if exists "cages_insert" on public.cages;
create policy "cages_insert" on public.cages
for insert with check (tenant_id = auth.uid()::text or public.is_admin());

drop policy if exists "cages_update" on public.cages;
create policy "cages_update" on public.cages
for update using (tenant_id = auth.uid()::text or public.is_admin())
with check (tenant_id = auth.uid()::text or public.is_admin());

drop policy if exists "cages_delete" on public.cages;
create policy "cages_delete" on public.cages
for delete using (tenant_id = auth.uid()::text or public.is_admin());

drop policy if exists "hatchery_brooders_select" on public.hatchery_brooders;
create policy "hatchery_brooders_select" on public.hatchery_brooders
for select using (tenant_id = auth.uid()::text or public.is_admin());

drop policy if exists "hatchery_brooders_insert" on public.hatchery_brooders;
create policy "hatchery_brooders_insert" on public.hatchery_brooders
for insert with check (tenant_id = auth.uid()::text or public.is_admin());

drop policy if exists "hatchery_brooders_update" on public.hatchery_brooders;
create policy "hatchery_brooders_update" on public.hatchery_brooders
for update using (tenant_id = auth.uid()::text or public.is_admin())
with check (tenant_id = auth.uid()::text or public.is_admin());

drop policy if exists "hatchery_brooders_delete" on public.hatchery_brooders;
create policy "hatchery_brooders_delete" on public.hatchery_brooders
for delete using (tenant_id = auth.uid()::text or public.is_admin());

drop policy if exists "hatchery_fingerling_batches_select" on public.hatchery_fingerling_batches;
create policy "hatchery_fingerling_batches_select" on public.hatchery_fingerling_batches
for select using (tenant_id = auth.uid()::text or public.is_admin());

drop policy if exists "hatchery_fingerling_batches_insert" on public.hatchery_fingerling_batches;
create policy "hatchery_fingerling_batches_insert" on public.hatchery_fingerling_batches
for insert with check (tenant_id = auth.uid()::text or public.is_admin());

drop policy if exists "hatchery_fingerling_batches_update" on public.hatchery_fingerling_batches;
create policy "hatchery_fingerling_batches_update" on public.hatchery_fingerling_batches
for update using (tenant_id = auth.uid()::text or public.is_admin())
with check (tenant_id = auth.uid()::text or public.is_admin());

drop policy if exists "hatchery_fingerling_batches_delete" on public.hatchery_fingerling_batches;
create policy "hatchery_fingerling_batches_delete" on public.hatchery_fingerling_batches
for delete using (tenant_id = auth.uid()::text or public.is_admin());
