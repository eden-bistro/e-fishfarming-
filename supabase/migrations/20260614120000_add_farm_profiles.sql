create table if not exists farm_profiles (
  tenant_id text primary key,
  name text not null,
  location text not null,
  owner text not null,
  currency text not null,
  total_ponds numeric,
  total_stock_kg numeric,
  cage_names text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_farm_profiles_updated_at on farm_profiles (updated_at desc);

alter table if exists public.farm_profiles enable row level security;

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
