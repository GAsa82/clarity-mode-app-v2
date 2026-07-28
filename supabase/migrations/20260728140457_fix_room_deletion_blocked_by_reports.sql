-- Found during the security/database audit earlier this session:
-- user_reports.room_id was ON DELETE NO ACTION, meaning a room could not be
-- deleted while ANY report referenced it — so the rooms most likely to need
-- deletion (the reported ones) were exactly the ones blocked from it.
--
-- SET NULL matches the pattern already used elsewhere this session
-- (confessions, orders, audit_logs): the report itself is preserved for
-- moderation history, but no longer pins the room in place. Deleting a room
-- for cause should not be blocked by the very report that flagged it.

alter table public.user_reports
  drop constraint if exists user_reports_room_id_fkey;

alter table public.user_reports
  add constraint user_reports_room_id_fkey
  foreign key (room_id) references public.rooms(id) on delete set null;
