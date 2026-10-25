-- Move SECURITY DEFINER helpers out of the API-exposed public schema.
-- RLS policies reference functions by OID, so they keep working.
create schema if not exists private;
grant usage on schema private to authenticated;

alter function public.app_role() set schema private;
alter function public.is_member() set schema private;
alter function public.is_pm() set schema private;
alter function public.log_changes() set schema private;
alter function public.take_snapshot() set schema private;

-- is_pm() calls app_role(), which now lives in private
alter function private.is_pm() set search_path = public, private;

revoke execute on all functions in schema private from public, anon;
grant execute on function private.app_role(), private.is_member(), private.is_pm() to authenticated;
