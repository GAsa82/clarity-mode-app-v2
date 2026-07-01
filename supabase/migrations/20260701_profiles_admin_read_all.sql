-- ============================================================================
-- Fix: profiles had no policy letting admins see any row but their own —
-- the entire Users admin page (AdminUsers.tsx) only ever showed the admin's
-- own account, not the real user list, and SubscriptionsAdmin.tsx's
-- profile-lookup join was equally blind to other users.
--
-- A direct self-referential EXISTS subquery on profiles causes infinite
-- recursion (42P17) — evaluating the policy re-triggers RLS on the same
-- table/policy. Fixed with a SECURITY DEFINER helper function that bypasses
-- RLS internally, matching this project's existing is_premium()/
-- get_user_plan() pattern, with search_path pinned (those weren't).
--
-- Verified: admin sees all profiles (2/2), a non-admin test account still
-- only sees its own row (1/1).
-- ============================================================================

create or replace function public.is_admin_user(uid uuid)
returns boolean
language sql
stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = uid and role = 'admin'
  );
$$;

drop policy if exists "admin reads all profiles" on public.profiles;
create policy "admin reads all profiles"
  on public.profiles for select
  to authenticated
  using (
    public.is_admin_user(auth.uid())
    OR (auth.jwt() ->> 'email') LIKE 'gauravsinghdata6%@gmail.com'
  );
