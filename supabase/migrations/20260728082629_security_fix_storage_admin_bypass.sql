-- Same finding as the public-schema policies (see the prior migration), just
-- in the storage schema: cms_media_admin_write/update/delete all carried the
-- same hardcoded LIKE 'gauravsinghdata6%@gmail.com' fallback, which would
-- let anyone who registers a matching email upload, overwrite, or delete
-- files in the PUBLIC cms-media bucket. Removing it — the real admin is
-- already covered by profiles.role.

drop policy if exists "cms_media_admin_write" on storage.objects;
create policy "cms_media_admin_write" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'cms-media'
    and exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = any (array['admin','super_admin']))
  );

drop policy if exists "cms_media_admin_update" on storage.objects;
create policy "cms_media_admin_update" on storage.objects for update to authenticated
  using (
    bucket_id = 'cms-media'
    and exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = any (array['admin','super_admin']))
  );

drop policy if exists "cms_media_admin_delete" on storage.objects;
create policy "cms_media_admin_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'cms-media'
    and exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = any (array['admin','super_admin']))
  );
