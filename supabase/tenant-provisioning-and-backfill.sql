-- Tenant provisioning + backfill helpers
-- Run as service_role/admin in Supabase SQL editor.

-- 1) AUDIT: users missing app_metadata.farm_id
select id, email, raw_app_meta_data
from auth.users
where coalesce(raw_app_meta_data ->> 'farm_id', '') = '';

-- 2) BACKFILL users (example): assign missing users to farm_001
-- Replace 'farm_001' with correct tenant assignment logic per user.
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('farm_id', 'farm_001')
where coalesce(raw_app_meta_data ->> 'farm_id', '') = '';

-- 3) AUDIT: rows with missing/blank tenant IDs (should be zero)
select 'finance_income' as table_name, count(*) as invalid_rows from public.finance_income where coalesce(farm_id, '') = ''
union all
select 'finance_expenses', count(*) from public.finance_expenses where coalesce(farm_id, '') = ''
union all
select 'feeding_events', count(*) from public.feeding_events where coalesce(farm_id, '') = ''
union all
select 'water_readings', count(*) from public.water_readings where coalesce(farm_id, '') = '';

-- 4) BACKFILL example row migration (repeat per table / farm mapping)
-- update public.finance_income set farm_id = 'farm_001' where coalesce(farm_id, '') = '' and <your filter>;
-- update public.finance_expenses set farm_id = 'farm_001' where coalesce(farm_id, '') = '' and <your filter>;
-- update public.feeding_events set farm_id = 'farm_001' where coalesce(farm_id, '') = '' and <your filter>;
-- update public.water_readings set farm_id = 'farm_001' where coalesce(farm_id, '') = '' and <your filter>;
