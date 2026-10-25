-- Jira sync: daily cron call to the Edge Function, weekly snapshot.
-- Requires two Vault secrets per environment (created outside this repo):
--   project_url  = https://<ref>.supabase.co
--   cron_secret  = random value, checked by the Edge Function via check_cron_secret()
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Called by the Edge Function (service role) to authenticate cron calls
create function public.check_cron_secret(candidate text) returns boolean
language sql stable security definer set search_path = public, vault as $$
  select exists (
    select 1 from vault.decrypted_secrets where name = 'cron_secret' and decrypted_secret = candidate
  )
$$;

-- One snapshot per week at most, called by the Edge Function (service role)
create function public.take_weekly_snapshot() returns integer
language plpgsql security definer set search_path = public, private as $$
begin
  if exists (select 1 from snapshot where taken_at > now() - interval '6 days') then
    return 0;
  end if;
  return private.take_snapshot();
end $$;

revoke execute on function public.check_cron_secret(text) from public, anon, authenticated;
revoke execute on function public.take_weekly_snapshot() from public, anon, authenticated;
grant execute on function public.check_cron_secret(text) to service_role;
grant execute on function public.take_weekly_snapshot() to service_role;

-- The Edge Function writes sync_run and the jira_link cache with the service role (bypasses RLS)

-- Daily at 05:00 UTC (06:00 Zurich in winter, 07:00 in summer)
select cron.schedule(
  'jira-sync-daily',
  '0 5 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/jira-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{"trigger":"cron"}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
