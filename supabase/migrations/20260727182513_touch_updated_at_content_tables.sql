-- These six tables carry an updated_at column that nothing ever wrote to, so it
-- sat frozen at created_at for the row's whole life. Surfaced while verifying
-- the new body editor: an edit persisted correctly but left updated_at
-- untouched, which makes "when was this last changed" unanswerable — and that
-- matters most for content_items now that a pipeline writes rows a human then
-- edits by hand.
--
-- touch_updated_at() already exists and is used by every diary_* table. It is
-- SECURITY DEFINER with search_path pinned to public, matching the hardening
-- already applied across this project.

create trigger coaching_sessions_touch before update on public.coaching_sessions
  for each row execute function public.touch_updated_at();

create trigger content_items_touch before update on public.content_items
  for each row execute function public.touch_updated_at();

create trigger old_books_touch before update on public.old_books
  for each row execute function public.touch_updated_at();

create trigger research_papers_touch before update on public.research_papers
  for each row execute function public.touch_updated_at();

create trigger site_settings_touch before update on public.site_settings
  for each row execute function public.touch_updated_at();

create trigger websites_touch before update on public.websites
  for each row execute function public.touch_updated_at();
