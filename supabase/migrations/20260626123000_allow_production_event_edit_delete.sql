-- Allow farm users to manage their own production event corrections.
drop policy if exists "production_events_update" on public.production_events;
create policy "production_events_update" on public.production_events
for update using (tenant_id = auth.uid()::text or public.is_admin())
with check (tenant_id = auth.uid()::text or public.is_admin());

drop policy if exists "production_events_delete" on public.production_events;
create policy "production_events_delete" on public.production_events
for delete using (tenant_id = auth.uid()::text or public.is_admin());
