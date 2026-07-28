-- confessions.user_id and confession_replies.user_id are UUID columns with
-- no FK constraint to profiles at all. INSERT is fully open (anon +
-- authenticated, with_check: true), so nothing stopped a malformed or
-- malicious insert from setting user_id to a UUID that doesn't correspond
-- to any real profile — silently orphaned references, broken joins if
-- anything ever displays "posted by" info. Zero existing rows have a
-- non-null user_id (verified before adding), so this is a pure gap-close,
-- not a data cleanup.
--
-- SET NULL matches the pattern already used for orders/audit_logs:
-- deleting a user shouldn't delete or block deletion of confession content,
-- just anonymize it (anon_id already exists alongside user_id for exactly
-- this — a confession can be anonymous).

alter table public.confessions
  add constraint confessions_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete set null;

alter table public.confession_replies
  add constraint confession_replies_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete set null;
