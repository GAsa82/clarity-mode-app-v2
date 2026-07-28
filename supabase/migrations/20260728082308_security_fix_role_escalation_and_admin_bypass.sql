-- ============================================================================
-- Finding 1: profiles.role had no protection against self-escalation.
-- "Users update own profile" only checked auth.uid() = id, with no
-- with_check and no column-level grant restriction, so any authenticated
-- user could PATCH their own row's `role` to 'admin' directly via the REST
-- API. Postgres RLS has no per-column granularity by default; the correct
-- fix is a trigger that rejects any role change unless the acting session
-- is already an admin or service_role.
-- ============================================================================
create or replace function public.prevent_self_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if auth.role() <> 'service_role' and not exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    ) then
      raise exception 'Only an admin can change a user''s role';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role_change on public.profiles;
create trigger profiles_guard_role_change
  before update on public.profiles
  for each row execute function public.prevent_self_role_escalation();

-- ============================================================================
-- Finding 2: 16 admin RLS policies across 12 tables carried a hardcoded
-- fallback: `OR auth.jwt()->>'email' LIKE 'gauravsinghdata6%@gmail.com'`.
-- LIKE with a trailing %-before-@ wildcard matches ANY string starting with
-- "gauravsinghdata6" before @gmail.com — e.g. a self-registered
-- "gauravsinghdata6xyz@gmail.com" would match and receive full admin access
-- to orders, coupons, site_settings, content, audit_logs, profiles, and
-- face_submissions (which handles real payments). The real owner's account
-- already has profiles.role = 'admin' (verified), so this fallback was pure
-- redundant risk with zero benefit — removing it, not narrowing it.
-- ============================================================================

drop policy if exists "audit_logs_admin_read" on public.audit_logs;
create policy "audit_logs_admin_read" on public.audit_logs for select to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "admin reads coaching followups" on public.coaching_followups;
create policy "admin reads coaching followups" on public.coaching_followups for select to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "admin updates coaching followups" on public.coaching_followups;
create policy "admin updates coaching followups" on public.coaching_followups for update to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "admin deletes coaching followups" on public.coaching_followups;
create policy "admin deletes coaching followups" on public.coaching_followups for delete to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "content_items_admin_all" on public.content_items;
create policy "content_items_admin_all" on public.content_items for all to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "coupons_admin_all" on public.coupons;
create policy "coupons_admin_all" on public.coupons for all to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "admin reads all faces" on public.face_submissions;
create policy "admin reads all faces" on public.face_submissions for select to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "admin moderates faces" on public.face_submissions;
create policy "admin moderates faces" on public.face_submissions for update to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "admin deletes faces" on public.face_submissions;
create policy "admin deletes faces" on public.face_submissions for delete to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "old_books_admin_all" on public.old_books;
create policy "old_books_admin_all" on public.old_books for all to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "orders_admin_all" on public.orders;
create policy "orders_admin_all" on public.orders for all to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "admin reads all profiles" on public.profiles;
create policy "admin reads all profiles" on public.profiles for select to authenticated
  using (is_admin_user(auth.uid()));

drop policy if exists "research_papers_admin_all" on public.research_papers;
create policy "research_papers_admin_all" on public.research_papers for all to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "site_settings_admin_write" on public.site_settings;
create policy "site_settings_admin_write" on public.site_settings for all to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = any (array['admin','super_admin'])))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = any (array['admin','super_admin'])));

drop policy if exists "testimonials_admin_all" on public.testimonials;
create policy "testimonials_admin_all" on public.testimonials for all to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "websites_admin_all" on public.websites;
create policy "websites_admin_all" on public.websites for all to authenticated
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'))
  with check (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
