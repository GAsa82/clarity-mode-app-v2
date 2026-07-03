-- Add covering indexes for foreign keys flagged by the Supabase performance
-- advisor (unindexed_foreign_keys). Applied 2026-07-02 to vajenjgxaznftlvribzl.
-- Zero correctness risk; improves FK-join and ON DELETE cascade performance as
-- data grows. Columns verified against pg_constraint before creating.
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id            ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_coaching_followups_session_id ON public.coaching_followups(session_id);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_user_id     ON public.coaching_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_coaching_testimonials_session_id ON public.coaching_testimonials(session_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id      ON public.payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_rooms_created_by              ON public.rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_saved_sessions_content_item_id ON public.saved_sessions(content_item_id);
CREATE INDEX IF NOT EXISTS idx_sessions_partner_id           ON public.sessions(partner_id);
CREATE INDEX IF NOT EXISTS idx_upload_history_diary_id       ON public.upload_history(diary_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported_id      ON public.user_reports(reported_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_room_id          ON public.user_reports(room_id);
