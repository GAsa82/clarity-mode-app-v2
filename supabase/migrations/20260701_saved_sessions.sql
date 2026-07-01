-- ============================================================================
-- "Save Session" button in ContentPreviewModal has never done anything —
-- no table existed to persist it (reported directly by the user testing on
-- a real device). Users manage their own saved sessions.
--
-- Verified via RLS simulation: insert/select/delete all succeed for the
-- owning user.
-- ============================================================================

create table if not exists public.saved_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, content_item_id)
);

create index if not exists saved_sessions_user_idx on public.saved_sessions (user_id);

alter table public.saved_sessions enable row level security;

drop policy if exists "users manage own saved sessions" on public.saved_sessions;
create policy "users manage own saved sessions"
  on public.saved_sessions for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, delete on public.saved_sessions to authenticated;

notify pgrst, 'reload schema';
