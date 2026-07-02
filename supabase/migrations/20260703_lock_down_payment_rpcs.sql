-- APPLIED TO PRODUCTION 2026-07-02 (audit finding — critical).
--
-- upsert_subscription / record_payment are SECURITY DEFINER functions and
-- were executable by anon + authenticated via /rest/v1/rpc — one HTTP call
-- could grant any account a free active subscription or forge payment rows.
-- Verified post-fix: anon call now fails with "permission denied";
-- the legitimate paid submission path still works.
--
-- Only the server (service_role: Vercel API routes / legacy edge functions)
-- may call them.

revoke execute on function public.upsert_subscription(uuid, text, text, text, text, text, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.record_payment(uuid, uuid, integer, text, text, text, text, text, jsonb) from public, anon, authenticated;

grant execute on function public.upsert_subscription(uuid, text, text, text, text, text, timestamptz, timestamptz) to service_role;
grant execute on function public.record_payment(uuid, uuid, integer, text, text, text, text, text, jsonb) to service_role;

-- face_payment_required() must stay executable by app roles: it is evaluated
-- inside the face_submissions INSERT policy with the caller's privileges.
revoke execute on function public.face_payment_required() from public;
grant execute on function public.face_payment_required() to anon, authenticated;
