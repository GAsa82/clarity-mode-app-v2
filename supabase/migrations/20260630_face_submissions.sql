-- ============================================================================
-- "Member of the Day" / Face of Clarity — real submission + admin review queue
-- Run this in your badly talks Supabase project (vajenjgxaznftlvribzl):
--   Dashboard -> SQL Editor -> paste -> Run
-- Safe to run more than once (idempotent).
-- ============================================================================

create table if not exists public.face_submissions (
  id           uuid primary key default gen_random_uuid(),
  username     text not null,
  image        text not null,                    -- small downscaled JPEG data URL
  status       text not null default 'pending'
               check (status in ('pending','approved','rejected')),
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz
);

create index if not exists face_submissions_status_idx
  on public.face_submissions (status, created_at desc);

alter table public.face_submissions enable row level security;

-- Visitors may submit, but only ever as 'pending' (can't self-approve).
drop policy if exists "anyone submits pending face" on public.face_submissions;
create policy "anyone submits pending face"
  on public.face_submissions for insert
  to anon, authenticated
  with check (status = 'pending');

-- Anyone may read APPROVED members (for the public "Member of the Day" widget).
drop policy if exists "public reads approved faces" on public.face_submissions;
create policy "public reads approved faces"
  on public.face_submissions for select
  to anon, authenticated
  using (status = 'approved');

-- Admin (by email) can read everything and moderate. Email-based so this
-- migration doesn't depend on your profiles/role schema. Add more admins by
-- extending the IN (...) list.
drop policy if exists "admin reads all faces" on public.face_submissions;
create policy "admin reads all faces"
  on public.face_submissions for select
  to authenticated
  using ((auth.jwt() ->> 'email') in ('gauravsinghdata6@gmail.com'));

drop policy if exists "admin moderates faces" on public.face_submissions;
create policy "admin moderates faces"
  on public.face_submissions for update
  to authenticated
  using      ((auth.jwt() ->> 'email') in ('gauravsinghdata6@gmail.com'))
  with check ((auth.jwt() ->> 'email') in ('gauravsinghdata6@gmail.com'));

drop policy if exists "admin deletes faces" on public.face_submissions;
create policy "admin deletes faces"
  on public.face_submissions for delete
  to authenticated
  using ((auth.jwt() ->> 'email') in ('gauravsinghdata6@gmail.com'));

-- PostgREST needs table-level grants IN ADDITION to the RLS policies above.
grant select, insert on public.face_submissions to anon, authenticated;
grant update, delete on public.face_submissions to authenticated;

-- Make the new table visible to the API immediately.
notify pgrst, 'reload schema';
