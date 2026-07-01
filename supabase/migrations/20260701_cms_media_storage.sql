-- ============================================================================
-- Real file upload for the CMS. Previously every media field (cover, audio,
-- video, PDF, avatar) was a manual URL-paste text input, and zero Supabase
-- Storage buckets existed — an admin had to host files elsewhere and paste
-- the link. This creates a public bucket + RLS so uploads work directly from
-- the admin forms.
--
-- Folder layout inside `cms-media`: covers/, audio/, video/, files/,
-- previews/, papers/, avatars/ — organisational only, not enforced by RLS.
--
-- Already applied directly to the live project (2026-07-01) and verified via
-- RLS simulation (admin insert succeeds, non-admin insert blocked, anon read
-- succeeds).
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('cms-media', 'cms-media', true, 209715200) -- 200MB max per file
on conflict (id) do nothing;

drop policy if exists "cms_media_public_read" on storage.objects;
create policy "cms_media_public_read" on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'cms-media');

drop policy if exists "cms_media_admin_write" on storage.objects;
create policy "cms_media_admin_write" on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'cms-media'
    and (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      OR (auth.jwt() ->> 'email') LIKE 'gauravsinghdata6%@gmail.com'
    )
  );

drop policy if exists "cms_media_admin_update" on storage.objects;
create policy "cms_media_admin_update" on storage.objects for update
  to authenticated
  using (
    bucket_id = 'cms-media'
    and (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      OR (auth.jwt() ->> 'email') LIKE 'gauravsinghdata6%@gmail.com'
    )
  );

drop policy if exists "cms_media_admin_delete" on storage.objects;
create policy "cms_media_admin_delete" on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'cms-media'
    and (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      OR (auth.jwt() ->> 'email') LIKE 'gauravsinghdata6%@gmail.com'
    )
  );
