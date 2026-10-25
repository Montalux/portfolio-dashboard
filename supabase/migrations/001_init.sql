-- Portfolio-Dashboard v1: schema, RLS, triggers
-- Initiatives live here (master). Jira is read-only context (epics, JPD items).

-- ============================================================
-- Types
-- ============================================================
create type user_role as enum ('entscheider', 'pm', 'leser');
create type initiative_status as enum ('geplant', 'laufend', 'abgeschlossen', 'abgebrochen');
create type rag_color as enum ('gruen', 'gelb', 'rot');
create type budget_status as enum ('platzhalter', 'beantragt', 'bewilligt');
create type jira_link_kind as enum ('epic', 'jpd');

-- ============================================================
-- Tables
-- ============================================================

-- Allowlist and roles. Users are invited only (public signup disabled).
create table app_user (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text not null,
  role user_role not null,
  created_at timestamptz not null default now()
);

-- New initiatives continue the MON numbering (MON-21, MON-22, ...).
create sequence initiative_key_seq start 21;

create table initiative (
  id uuid primary key default gen_random_uuid(),
  key text not null unique default ('MON-' || nextval('initiative_key_seq')),
  title text not null,
  description text,
  status initiative_status not null default 'geplant',
  start_date date,
  due_date date,
  rag rag_color,
  rag_reason text,
  rag_updated_at timestamptz,
  decision_needed boolean not null default false,
  decision_question text,
  budget_chf numeric(12, 2),
  budget_status budget_status not null default 'platzhalter',
  actual_chf numeric(12, 2),
  forecast_chf numeric(12, 2),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rag_reason_required
    check (rag is null or rag = 'gruen' or nullif(trim(rag_reason), '') is not null),
  constraint decision_question_required
    check (not decision_needed or nullif(trim(decision_question), '') is not null),
  constraint dates_in_order
    check (start_date is null or due_date is null or due_date >= start_date),
  constraint amounts_not_negative
    check (coalesce(budget_chf, 0) >= 0 and coalesce(actual_chf, 0) >= 0 and coalesce(forecast_chf, 0) >= 0)
);

create table milestone (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references initiative (id) on delete cascade,
  title text not null,
  due_date date not null,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on milestone (initiative_id);

-- "initiative_id blocks blocks_initiative_id"
create table dependency (
  initiative_id uuid not null references initiative (id) on delete cascade,
  blocks_initiative_id uuid not null references initiative (id) on delete cascade,
  primary key (initiative_id, blocks_initiative_id),
  constraint no_self_dependency check (initiative_id <> blocks_initiative_id)
);

-- Configurable Jira instances. The token itself lives in an Edge Function secret.
create table jira_source (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  base_url text not null,
  auth_email text not null,
  secret_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table jira_link (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references initiative (id) on delete cascade,
  source_id uuid not null references jira_source (id),
  issue_key text not null,
  kind jira_link_kind not null,
  -- cache, written by the sync
  summary text,
  status text,
  status_category text,
  start_date date,
  due_date date,
  progress_pct numeric(5, 2),
  last_synced_at timestamptz,
  sync_error text,
  created_at timestamptz not null default now(),
  unique (initiative_id, source_id, issue_key)
);
create index on jira_link (initiative_id);

-- Append-only change history (basis for RAG history and audit trail)
create table change_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  row_id uuid not null,
  field text not null,
  old_value jsonb,
  new_value jsonb,
  changed_by uuid,
  changed_at timestamptz not null default now()
);
create index on change_log (table_name, row_id, changed_at);

-- Append-only weekly state
create table snapshot (
  id bigint generated always as identity primary key,
  taken_at timestamptz not null default now(),
  initiative_id uuid not null references initiative (id),
  status initiative_status not null,
  rag rag_color,
  due_date date,
  budget_chf numeric(12, 2),
  actual_chf numeric(12, 2),
  forecast_chf numeric(12, 2)
);
create index on snapshot (initiative_id, taken_at);

create table sync_run (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  trigger text not null check (trigger in ('cron', 'manual')),
  ok boolean,
  error text
);

-- ============================================================
-- Helper functions
-- ============================================================
create function app_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from app_user where user_id = auth.uid()
$$;

create function is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from app_user where user_id = auth.uid())
$$;

create function is_pm() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(app_role() = 'pm', false)
$$;

-- ============================================================
-- Triggers
-- ============================================================
create function set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger initiative_updated_at before update on initiative
  for each row execute function set_updated_at();
create trigger milestone_updated_at before update on milestone
  for each row execute function set_updated_at();

create function set_rag_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.rag is not null then new.rag_updated_at := now(); end if;
  elsif new.rag is distinct from old.rag or new.rag_reason is distinct from old.rag_reason then
    new.rag_updated_at := now();
  end if;
  return new;
end $$;

create trigger initiative_rag_updated_at before insert or update on initiative
  for each row execute function set_rag_updated_at();

-- One change_log row per changed field
create function log_changes() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  k text;
  o jsonb;
  n jsonb;
begin
  if tg_op = 'INSERT' then
    insert into change_log (table_name, row_id, field, old_value, new_value, changed_by)
    values (tg_table_name, new.id, '_created', null, to_jsonb(new), auth.uid());
    return new;
  elsif tg_op = 'DELETE' then
    insert into change_log (table_name, row_id, field, old_value, new_value, changed_by)
    values (tg_table_name, old.id, '_deleted', to_jsonb(old), null, auth.uid());
    return old;
  end if;

  o := to_jsonb(old);
  n := to_jsonb(new);
  for k in select jsonb_object_keys(n) loop
    continue when k in ('updated_at', 'rag_updated_at');
    if o -> k is distinct from n -> k then
      insert into change_log (table_name, row_id, field, old_value, new_value, changed_by)
      values (tg_table_name, new.id, k, o -> k, n -> k, auth.uid());
    end if;
  end loop;
  return new;
end $$;

create trigger initiative_log after insert or update or delete on initiative
  for each row execute function log_changes();
create trigger milestone_log after insert or update or delete on milestone
  for each row execute function log_changes();

-- Block update/delete on append-only tables, also for the service role
create function prevent_mutation() returns trigger
language plpgsql set search_path = public as $$
begin
  raise exception '% is append-only', tg_table_name;
end $$;

create trigger change_log_append_only before update or delete on change_log
  for each row execute function prevent_mutation();
create trigger snapshot_append_only before update or delete on snapshot
  for each row execute function prevent_mutation();

-- Weekly snapshot, called by the sync job
create function take_snapshot() returns integer
language sql security definer set search_path = public as $$
  with ins as (
    insert into snapshot (initiative_id, status, rag, due_date, budget_chf, actual_chf, forecast_chf)
    select id, status, rag, due_date, budget_chf, actual_chf, forecast_chf
    from initiative
    where archived_at is null
    returning 1
  )
  select count(*)::integer from ins
$$;
revoke execute on function take_snapshot() from public, anon, authenticated;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table app_user enable row level security;
alter table initiative enable row level security;
alter table milestone enable row level security;
alter table dependency enable row level security;
alter table jira_source enable row level security;
alter table jira_link enable row level security;
alter table change_log enable row level security;
alter table snapshot enable row level security;
alter table sync_run enable row level security;

-- No access at all for anonymous visitors
revoke all on app_user, initiative, milestone, dependency, jira_source, jira_link,
  change_log, snapshot, sync_run from anon;

-- Read: every allowlisted user
create policy read_members on app_user for select to authenticated using (is_member());
create policy read_members on initiative for select to authenticated using (is_member());
create policy read_members on milestone for select to authenticated using (is_member());
create policy read_members on dependency for select to authenticated using (is_member());
create policy read_members on jira_source for select to authenticated using (is_member());
create policy read_members on jira_link for select to authenticated using (is_member());
create policy read_members on change_log for select to authenticated using (is_member());
create policy read_members on snapshot for select to authenticated using (is_member());
create policy read_members on sync_run for select to authenticated using (is_member());

-- Write: PM only. No delete on initiative (archive via archived_at).
create policy pm_insert on initiative for insert to authenticated with check (is_pm());
create policy pm_update on initiative for update to authenticated using (is_pm()) with check (is_pm());

create policy pm_all on milestone for all to authenticated using (is_pm()) with check (is_pm());
create policy pm_all on dependency for all to authenticated using (is_pm()) with check (is_pm());
create policy pm_all on jira_link for all to authenticated using (is_pm()) with check (is_pm());
create policy pm_all on jira_source for all to authenticated using (is_pm()) with check (is_pm());
-- app_user, change_log, snapshot, sync_run: no write policies (service role / triggers only)
-- Jira sources are inserted per environment (not in this public repo).
