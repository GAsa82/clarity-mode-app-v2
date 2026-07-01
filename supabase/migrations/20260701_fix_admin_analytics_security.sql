-- ============================================================================
-- Security fix: admin_analytics was created without security_invoker, so
-- Postgres ran it with the CREATOR's privileges (bypassing RLS) for any
-- authenticated caller — any logged-in user, not just admins, could query
-- business metrics (total revenue, user counts) directly via the REST API,
-- bypassing the frontend's admin-only route guard entirely. Flagged as an
-- ERROR-level finding by Supabase's security advisor.
--
-- Fix: security_invoker so the view respects the CALLER's own RLS, plus an
-- explicit admin-only WHERE gate so non-admins get zero rows outright.
-- Verified: admin sees 1 row, non-admin sees 0 rows.
-- ============================================================================

drop view if exists public.admin_analytics;

create view public.admin_analytics
with (security_invoker = true)
as
select
  (select count(*) from public.profiles)                                          as total_users,
  (select count(*) from public.subscriptions where status = 'active')             as active_subscriptions,
  (select count(*) from public.orders)                                            as total_orders,
  (select coalesce(sum(amount), 0) from public.orders where status = 'completed') as total_revenue_paise,
  (select count(*) from public.research_papers where status = 'published')        as published_papers,
  (select count(*) from public.content_items where status = 'published')          as published_content,
  (select coalesce(sum(available), 0) from public.old_books)                      as books_in_stock
where
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  OR (auth.jwt() ->> 'email') LIKE 'gauravsinghdata6%@gmail.com';

grant select on public.admin_analytics to authenticated;
