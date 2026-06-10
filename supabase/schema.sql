-- LOGD — paste into Supabase SQL Editor and Run (safe to re-run).
-- Solo use without Auth: RLS off + grants to anon so the browser anon key works.

-- =============================================================================
-- LOGS (habits) — used by the app today
-- =============================================================================

-- Tables ---------------------------------------------------------------------

create table if not exists public.logs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text not null default 'edit_note',
  color text not null default '#4ade80',
  archived boolean not null default false,
  notes text not null default '',
  schedule_json jsonb not null default '{"cadence":"daily","weekdays":[]}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.log_entries (
  log_id uuid not null references public.logs (id) on delete cascade,
  logged_date date not null,
  primary key (log_id, logged_date)
);

-- PK (log_id, logged_date) already indexes by log_id; no separate log_id index needed.

-- Per-log totals without scanning all entry rows from the client.
create or replace view public.log_entry_totals as
  select log_id, count(*)::int as total
  from public.log_entries
  group by log_id;

grant select on public.log_entry_totals to anon, authenticated;

-- Speeds up tiered date-range loads (gte / lt on logged_date).
create index if not exists log_entries_logged_date_idx on public.log_entries (logged_date);

-- Browser client (anon key) permissions --------------------------------------
-- Without these, PostgREST returns 401/permission denied for anon.

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.logs to anon, authenticated;
-- DELETE on log_entries is required for unchecking a day (toggle off). Re-run this file if uncheck flashes then reverts.
grant select, insert, update, delete on table public.log_entries to anon, authenticated;

-- Solo dev: no Auth yet — turn RLS off so policies are not required.
-- When you add Auth + user_id, re-enable RLS and replace this with policies.

alter table public.logs disable row level security;
alter table public.log_entries disable row level security;

-- Existing projects: additive upgrades (safe to re-run).
alter table public.logs add column if not exists notes text not null default '';
alter table public.logs add column if not exists schedule_json jsonb not null default '{"cadence":"daily","weekdays":[]}'::jsonb;
alter table public.logs add column if not exists sort_order integer not null default 0;

create index if not exists logs_sort_order_idx on public.logs (sort_order);

-- Backfill sort_order from creation time when every row is still 0 (safe to re-run).
with ordered as (
  select id, (row_number() over (order by created_at asc) - 1)::int as rn
  from public.logs
)
update public.logs as l
set sort_order = ordered.rn
from ordered
where l.id = ordered.id
  and not exists (select 1 from public.logs where sort_order <> 0);

-- Optional: helps if you add Supabase Realtime later
-- alter publication supabase_realtime add table public.logs;
-- alter publication supabase_realtime add table public.log_entries;

-- =============================================================================
-- GOALS — planned; not wired in the app yet
-- =============================================================================
-- Add goal tables, views, grants, and RLS here when goal tracking ships.
