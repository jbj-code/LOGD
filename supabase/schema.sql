-- LOGD — run in Supabase SQL Editor (full script; safe to re-run with caveats below).
-- Solo use without Auth: RLS off + grants to anon so the browser anon key works.

-- Tables ---------------------------------------------------------------------

create table if not exists public.logs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text not null default 'edit_note',
  color text not null default '#4ade80',
  archived boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.log_entries (
  log_id uuid not null references public.logs (id) on delete cascade,
  logged_date date not null,
  primary key (log_id, logged_date)
);

create index if not exists log_entries_log_id_idx on public.log_entries (log_id);

-- Browser client (anon key) permissions --------------------------------------
-- Without these, PostgREST returns 401/permission denied for anon.

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.logs to anon, authenticated;
grant select, insert, update, delete on table public.log_entries to anon, authenticated;

-- Solo dev: no Auth yet — turn RLS off so policies are not required.
-- When you add Auth + user_id, re-enable RLS and replace this with policies.

alter table public.logs disable row level security;
alter table public.log_entries disable row level security;

-- Existing projects created before `notes`: add column (safe to re-run).
alter table public.logs add column if not exists notes text not null default '';

-- Optional: helps if you add Supabase Realtime later
-- alter publication supabase_realtime add table public.logs;
-- alter publication supabase_realtime add table public.log_entries;
