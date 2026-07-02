-- Presence Verification: session metadata for Deep Work Challenges.
-- Stores ONLY metadata (timestamps, counters, status) — never video/images.
-- Flagged sessions are surfaced in the admin Presence Verification panel.

create table if not exists public.presence_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  room_slug text not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  planned_min integer not null,
  elapsed_sec integer not null,
  present_sec integer not null,
  present_ratio numeric(4,3) not null default 0,
  status text not null check (status in ('completed','failed','abandoned')),
  fail_reason text,
  suspicion_score integer not null default 0,
  flagged boolean not null default false,
  flag_reasons jsonb not null default '[]'::jsonb,
  counters jsonb,
  created_at timestamptz not null default now()
);

create index if not exists presence_sessions_flagged_idx
  on public.presence_sessions (flagged, started_at desc);
create index if not exists presence_sessions_user_idx
  on public.presence_sessions (user_id, started_at desc);

alter table public.presence_sessions enable row level security;

-- Users can record and view their own sessions.
drop policy if exists "presence_sessions_insert_own" on public.presence_sessions;
create policy "presence_sessions_insert_own"
  on public.presence_sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists "presence_sessions_select_own" on public.presence_sessions;
create policy "presence_sessions_select_own"
  on public.presence_sessions for select
  using (auth.uid() = user_id);

-- Admins can review all sessions (flagged-session review).
drop policy if exists "presence_sessions_admin_read" on public.presence_sessions;
create policy "presence_sessions_admin_read"
  on public.presence_sessions for select
  using (public.is_admin_user(auth.uid()));

grant select, insert on public.presence_sessions to authenticated;
