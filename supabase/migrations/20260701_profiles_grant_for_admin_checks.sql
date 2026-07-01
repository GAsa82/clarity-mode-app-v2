-- ============================================================================
-- Fix: admin-gated RLS policies that check profiles.role (e.g. the
-- "admin reads all faces" policy on face_submissions) require the
-- `authenticated` role to have a table-level SELECT grant on `profiles` —
-- RLS policies alone are not sufficient in Postgres.
--
-- Without this grant, any policy that does
--   EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
-- throws "permission denied for table profiles" the moment it's evaluated —
-- which surfaced in the app as a misleading "did you run the migration?" error
-- on the Member Submissions admin queue, even though face_submissions itself
-- was configured correctly.
--
-- Already applied directly to the live project (2026-07-01). This file
-- documents the change for migration history / future environments.
-- ============================================================================

grant select, update on public.profiles to authenticated;

notify pgrst, 'reload schema';
