-- ============================================================================
-- coaching_followups access model: users may submit follow-ups; only admins
-- can view, update, or manage them.
--
-- Previously this table had RLS enabled but ZERO policies, denying all
-- access. Adds:
--   INSERT — open to anon + authenticated (matches the existing
--            "Anyone can create a coaching session" pattern on
--            coaching_sessions — follow-ups are submitted the same way).
--   SELECT/UPDATE/DELETE — admin only, via the same
--            profiles.role = 'admin' OR email-fallback check already used
--            for face_submissions in this project.
--
-- Already applied directly to the live project (2026-07-01) and verified via
-- pg_policies + information_schema.role_table_grants. This file documents
-- the change for migration history / future environments.
-- ============================================================================

drop policy if exists "anyone creates coaching followup" on public.coaching_followups;
create policy "anyone creates coaching followup"
  on public.coaching_followups for insert
  to anon, authenticated
  with check (true);

drop policy if exists "admin reads coaching followups" on public.coaching_followups;
create policy "admin reads coaching followups"
  on public.coaching_followups for select
  to authenticated
  using (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (auth.jwt() ->> 'email') LIKE 'gauravsinghdata6%@gmail.com'
  );

drop policy if exists "admin updates coaching followups" on public.coaching_followups;
create policy "admin updates coaching followups"
  on public.coaching_followups for update
  to authenticated
  using (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (auth.jwt() ->> 'email') LIKE 'gauravsinghdata6%@gmail.com'
  )
  with check (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (auth.jwt() ->> 'email') LIKE 'gauravsinghdata6%@gmail.com'
  );

drop policy if exists "admin deletes coaching followups" on public.coaching_followups;
create policy "admin deletes coaching followups"
  on public.coaching_followups for delete
  to authenticated
  using (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (auth.jwt() ->> 'email') LIKE 'gauravsinghdata6%@gmail.com'
  );

grant insert on public.coaching_followups to anon, authenticated;
grant select, update, delete on public.coaching_followups to authenticated;

notify pgrst, 'reload schema';
