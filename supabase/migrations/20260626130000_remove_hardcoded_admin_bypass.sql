-- Remove runtime hardcoded admin-email bypasses. Existing bootstrap admin rows remain
-- in public.profiles, but ongoing authorization now depends on stored roles or trusted JWT app metadata.
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then null
    when coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() ->> 'role') = 'admin' then 'admin'
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
