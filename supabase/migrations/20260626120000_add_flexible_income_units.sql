alter table if exists public.finance_income
  add column if not exists income_type text not null default 'Fish sale',
  add column if not exists unit text not null default 'kg',
  add column if not exists quantity numeric not null default 0,
  add column if not exists unit_price numeric not null default 0;

update public.finance_income
set
  quantity = coalesce(nullif(quantity, 0), quantity_kg),
  unit_price = coalesce(nullif(unit_price, 0), price_per_kg),
  unit = coalesce(nullif(trim(unit), ''), 'kg'),
  income_type = coalesce(nullif(trim(income_type), ''), 'Fish sale')
where quantity = 0 or unit_price = 0 or trim(unit) = '' or trim(income_type) = '';
