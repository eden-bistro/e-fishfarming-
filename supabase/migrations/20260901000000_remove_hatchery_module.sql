-- Retire the legacy hatchery module and all of its tenant-scoped data.
drop table if exists public.hatchery_fingerling_batches;
drop table if exists public.hatchery_brooders;
