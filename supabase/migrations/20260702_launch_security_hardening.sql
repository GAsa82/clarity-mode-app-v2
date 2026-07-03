-- ── Launch-readiness security hardening (from Supabase security advisor) ──
-- Applied 2026-07-02 to project vajenjgxaznftlvribzl.
--
-- All three tables below are written ONLY by server-side handlers using the
-- service_role key (which bypasses RLS). No frontend code inserts into them
-- (verified by grep across src/). Their public "WITH CHECK (true)" INSERT
-- policies are therefore unnecessary AND exploitable, so we drop them.

-- 1. coaching_sessions: an anon could POST a row with payment_status='paid'
--    to fake a confirmed booking for free, or spam-insert to occupy every
--    slot (slots.js treats any paid row as "slot taken") — a DoS on the
--    paid coaching calendar. Legit bookings insert via api/coaching verify
--    (service role), so this policy is not needed.
DROP POLICY IF EXISTS "Anyone can create a coaching session" ON public.coaching_sessions;

-- 2. coaching_followups: seeded server-side only.
DROP POLICY IF EXISTS "anyone creates coaching followup" ON public.coaching_followups;

-- 3. newsletter_subscribers: real signups go through /api/subscribe (service
--    role). Dropping the raw anon INSERT forces all subscribes through that
--    single controlled endpoint, so an attacker can't bulk-insert junk emails
--    directly into the list (which would wreck sender reputation). This leaves
--    the table with no client-facing policy (server-only) — that is intended.
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscribers;

-- 4. Pin search_path on functions currently flagged as mutable. Every one of
--    these references only public objects (some via unqualified names like
--    room_participants / user_stats), so "= public" is the correct safe value
--    and matches the already-pinned functions (is_admin_user, handle_new_user).
ALTER FUNCTION public.increment_match_count(uuid)                         SET search_path = public;
ALTER FUNCTION public.set_updated_at()                                    SET search_path = public;
ALTER FUNCTION public.is_premium(uuid)                                    SET search_path = public;
ALTER FUNCTION public.get_user_plan(uuid)                                 SET search_path = public;
ALTER FUNCTION public.trigger_set_updated_at()                            SET search_path = public;
ALTER FUNCTION public.fn_check_room_empty()                               SET search_path = public;
ALTER FUNCTION public.fn_check_room_ready()                               SET search_path = public;
ALTER FUNCTION public.fn_reset_daily_matches()                           SET search_path = public;
ALTER FUNCTION public.fn_ensure_user_stats()                              SET search_path = public;
ALTER FUNCTION public.record_payment(uuid, uuid, integer, text, text, text, text, text, jsonb) SET search_path = public;
ALTER FUNCTION public.upsert_subscription(uuid, text, text, text, text, text, timestamptz, timestamptz) SET search_path = public;

-- 5. handle_new_user() is a trigger function (fires on auth.users insert). It
--    is not used by any RLS policy or app RPC, so it should not be callable via
--    PostgREST /rpc/. Triggers run in the table-owner context regardless, so
--    revoking EXECUTE from callers does not affect the signup trigger.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
