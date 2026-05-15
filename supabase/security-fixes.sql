-- Security fix: ensure analytical views run with caller privileges (not definer).
-- Run in Supabase SQL editor.

DO $do$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'farmer_profit'
  ) THEN
    -- Force invoker semantics so RLS/user permissions are evaluated per caller.
    EXECUTE 'alter view public.farmer_profit set (security_invoker = true)';
  END IF;
END
$do$;
