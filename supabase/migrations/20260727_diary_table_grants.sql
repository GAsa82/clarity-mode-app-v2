-- ============================================================================
-- Diary — table grants for the API roles
-- ============================================================================
-- This database's default privileges do NOT grant newly-created tables to the
-- PostgREST roles (the same root cause as the earlier service_role grant
-- incident documented in CMS_AUDIT_REPORT). Without these, every diary query
-- returned HTTP 403 even though the RLS policies were correct — verified live.
--
-- Grants and RLS are independent layers and BOTH are required:
--   * GRANT decides whether the role may touch the table at all
--   * RLS decides which rows it may see
-- Granting here does not widen access — the admin-only policies from
-- 20260727_diary_knowledge_engine.sql still gate every row.
-- ============================================================================

grant select, insert, update, delete on
  public.diary_pages,
  public.diary_collections,
  public.diary_page_versions,
  public.diary_page_links,
  public.diary_assets
to authenticated;

-- service_role bypasses RLS and is what the Phase 2 server-side processing
-- pipeline will run as; it needs grants for the same reason.
grant select, insert, update, delete on
  public.diary_pages,
  public.diary_collections,
  public.diary_page_versions,
  public.diary_page_links,
  public.diary_assets
to service_role;
