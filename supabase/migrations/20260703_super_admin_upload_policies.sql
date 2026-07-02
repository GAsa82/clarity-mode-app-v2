-- ⚠️ NOT YET APPLIED TO PRODUCTION — review and apply manually.
-- (Automated application was intentionally blocked: this broadens RLS.)
--
-- Finding from the uploads audit: storage (cms-media) and site_settings
-- write policies only match role = 'admin'. The app also assigns
-- 'super_admin' (see AdminSettings), so a super_admin who isn't the founder
-- email silently fails every media upload and CMS settings save.
-- This aligns the policies with both admin roles.
--
-- Apply with: supabase db push, or paste into the Supabase SQL editor.

drop policy if exists "cms_media_admin_write" on storage.objects;
create policy "cms_media_admin_write" on storage.objects for insert to authenticated
with check (
  bucket_id = 'cms-media' and (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','super_admin'))
    or (auth.jwt() ->> 'email') like 'gauravsinghdata6%@gmail.com'
  )
);

drop policy if exists "cms_media_admin_update" on storage.objects;
create policy "cms_media_admin_update" on storage.objects for update to authenticated
using (
  bucket_id = 'cms-media' and (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','super_admin'))
    or (auth.jwt() ->> 'email') like 'gauravsinghdata6%@gmail.com'
  )
);

drop policy if exists "cms_media_admin_delete" on storage.objects;
create policy "cms_media_admin_delete" on storage.objects for delete to authenticated
using (
  bucket_id = 'cms-media' and (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','super_admin'))
    or (auth.jwt() ->> 'email') like 'gauravsinghdata6%@gmail.com'
  )
);

drop policy if exists "site_settings_admin_write" on public.site_settings;
create policy "site_settings_admin_write" on public.site_settings for all to authenticated
using (
  exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','super_admin'))
  or (auth.jwt() ->> 'email') like 'gauravsinghdata6%@gmail.com'
)
with check (
  exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin','super_admin'))
  or (auth.jwt() ->> 'email') like 'gauravsinghdata6%@gmail.com'
);
