-- ============================================================================
-- Fix: 8 core tables had RLS policies but ZERO table-level grants for
-- anon/authenticated (Postgres requires both — RLS alone is not enough).
-- These were effectively unreachable from the app: profile display, payments,
-- subscriptions, diary/journal, coaching booking, and newsletter signup could
-- all silently fail with "permission denied".
--
-- Grants below match each table's existing RLS policy intent exactly (no
-- broader access than the policies already define):
--   profiles                — users read/update own profile
--   payments                — users read own payments
--   subscriptions            — users read own subscription
--   diaries                  — users manage (all) own diaries
--   diary_entries            — users read/insert/delete own entries (no UPDATE policy exists)
--   coaching_sessions        — anyone can create; clients read their own
--   coaching_testimonials    — public read of published testimonials
--   newsletter_subscribers   — anyone can subscribe (no public read/listing policy exists)
--   upload_history           — users manage (all) own upload history
--
-- NOT included: coaching_followups — has RLS enabled but ZERO policies
-- defined, so it denies all access regardless of grants. Needs an actual
-- policy (who can read/write follow-ups?) before a grant does anything.
--
-- Already applied directly to the live project (2026-07-01). This file
-- documents the change for migration history / future environments.
-- ============================================================================

grant select on public.payments to authenticated;
grant select on public.subscriptions to authenticated;
grant select, insert, update, delete on public.diaries to authenticated;
grant select, insert, delete on public.diary_entries to authenticated;
grant insert, select on public.coaching_sessions to anon, authenticated;
grant select on public.coaching_testimonials to anon, authenticated;
grant insert on public.newsletter_subscribers to anon, authenticated;
grant select, insert, update, delete on public.upload_history to authenticated;

notify pgrst, 'reload schema';
