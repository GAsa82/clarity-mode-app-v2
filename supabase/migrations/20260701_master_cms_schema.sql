-- ============================================================================
-- Master CMS schema — creates the entire missing backend for the multi-site
-- CMS (Clarity Mode / badly talks + Breakthrough Protocol) in the correct
-- project (vajenjgxaznftlvribzl). Schema matches the existing frontend admin
-- pages exactly (ContentItemsAdmin, TestimonialsAdmin, ResearchPapersAdmin,
-- OldBooksAdmin, OrdersAdmin, CouponsAdmin, AuditLogsAdmin, SiteContentAdmin,
-- AnalyticsPage, WebsiteContext) so no frontend code changes were needed for
-- the tables themselves.
--
-- Context: these tables were designed and the admin UI built earlier, but
-- against a DIFFERENT (incorrect) Supabase project. This migration creates
-- them for real, in the project the live app actually uses. Already applied
-- directly to the live project (2026-07-01) and verified end-to-end (see
-- docs/CMS_AUDIT_REPORT.md).
-- ============================================================================

-- ─── websites ────────────────────────────────────────────────────────────────
create table if not exists public.websites (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  logo_url text,
  domain text,
  brand_color text not null default '#6366f1',
  accent_color text not null default '#8b5cf6',
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.websites enable row level security;

drop policy if exists "websites_public_read" on public.websites;
create policy "websites_public_read" on public.websites for select
  to anon, authenticated using (active = true);

drop policy if exists "websites_admin_all" on public.websites;
create policy "websites_admin_all" on public.websites for all
  to authenticated
  using (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (auth.jwt() ->> 'email') LIKE 'gauravsinghdata6%@gmail.com'
  )
  with check (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (auth.jwt() ->> 'email') LIKE 'gauravsinghdata6%@gmail.com'
  );

grant select on public.websites to anon, authenticated;
grant insert, update, delete on public.websites to authenticated;

insert into public.websites (id, slug, name, description, domain, brand_color, accent_color, active, sort)
values
  ('4b0f921b-85b9-4c25-9a1f-e954900af418', 'clarity-mode', 'badly talks', null, 'clarity-mode-app-v2-gq26.vercel.app', '#4790f5', '#8b5cf6', true, 1),
  ('47818d37-90d4-4ac0-b49d-81e2b2b945ed', 'breakthrough-protocol', 'Breakthrough Protocol', null, 'breakthrough-protocol.vercel.app', '#7c3aed', '#a78bfa', true, 2)
on conflict (slug) do nothing;

-- ─── content_items ───────────────────────────────────────────────────────────
create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  website_id uuid references public.websites(id) on delete cascade,
  type text not null,
  title text not null,
  description text,
  category text not null default 'general',
  cover_url text,
  file_url text,
  preview_url text,
  audio_url text,
  video_url text,
  price integer not null default 0,
  visibility text not null default 'premium' check (visibility in ('public','premium','private')),
  status text not null default 'draft' check (status in ('draft','published','archived','scheduled')),
  tags text[] not null default '{}',
  duration_sec integer,
  view_count integer not null default 0,
  download_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_items_website_type_idx on public.content_items (website_id, type);
create index if not exists content_items_status_idx on public.content_items (status);

alter table public.content_items enable row level security;

drop policy if exists "content_items_public_read" on public.content_items;
create policy "content_items_public_read" on public.content_items for select
  to anon, authenticated using (status = 'published');

drop policy if exists "content_items_admin_all" on public.content_items;
create policy "content_items_admin_all" on public.content_items for all
  to authenticated
  using (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (auth.jwt() ->> 'email') LIKE 'gauravsinghdata6%@gmail.com'
  )
  with check (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (auth.jwt() ->> 'email') LIKE 'gauravsinghdata6%@gmail.com'
  );

grant select on public.content_items to anon, authenticated;
grant insert, update, delete on public.content_items to authenticated;

-- ─── testimonials ────────────────────────────────────────────────────────────
create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  website_id uuid references public.websites(id) on delete cascade,
  name text not null,
  role text,
  quote text not null,
  rating integer check (rating between 1 and 5),
  avatar_url text,
  source text,
  published boolean not null default false,
  sort integer default 0,
  created_at timestamptz not null default now()
);

create index if not exists testimonials_website_idx on public.testimonials (website_id, published);

alter table public.testimonials enable row level security;

drop policy if exists "testimonials_public_read" on public.testimonials;
create policy "testimonials_public_read" on public.testimonials for select
  to anon, authenticated using (published = true);

drop policy if exists "testimonials_admin_all" on public.testimonials;
create policy "testimonials_admin_all" on public.testimonials for all
  to authenticated
  using (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (auth.jwt() ->> 'email') LIKE 'gauravsinghdata6%@gmail.com'
  )
  with check (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (auth.jwt() ->> 'email') LIKE 'gauravsinghdata6%@gmail.com'
  );

grant select on public.testimonials to anon, authenticated;
grant insert, update, delete on public.testimonials to authenticated;

-- ─── research_papers ─────────────────────────────────────────────────────────
create table if not exists public.research_papers (
  id uuid primary key default gen_random_uuid(),
  website_id uuid references public.websites(id) on delete cascade,
  title text not null,
  author text,
  category text not null default 'general',
  abstract text,
  pages integer,
  price integer not null default 0,
  cover_url text,
  pdf_url text,
  preview_url text,
  tags text[] not null default '{}',
  visibility text not null default 'premium' check (visibility in ('public','premium','private')),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  view_count integer not null default 0,
  download_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists research_papers_website_idx on public.research_papers (website_id, status);

alter table public.research_papers enable row level security;

drop policy if exists "research_papers_public_read" on public.research_papers;
create policy "research_papers_public_read" on public.research_papers for select
  to anon, authenticated using (status = 'published');

drop policy if exists "research_papers_admin_all" on public.research_papers;
create policy "research_papers_admin_all" on public.research_papers for all
  to authenticated
  using (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (auth.jwt() ->> 'email') LIKE 'gauravsinghdata6%@gmail.com'
  )
  with check (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (auth.jwt() ->> 'email') LIKE 'gauravsinghdata6%@gmail.com'
  );

grant select on public.research_papers to anon, authenticated;
grant insert, update, delete on public.research_papers to authenticated;

-- ─── old_books ───────────────────────────────────────────────────────────────
create table if not exists public.old_books (
  id uuid primary key default gen_random_uuid(),
  website_id uuid references public.websites(id) on delete cascade,
  title text not null,
  author text,
  category text,
  condition text not null default 'good' check (condition in ('like_new','very_good','good','fair','heavily_used')),
  mrp integer,
  price integer not null default 0,
  language text default 'English',
  publisher text,
  edition text,
  pages integer,
  year integer,
  isbn text,
  seller_name text,
  seller_notes text,
  cover_url text,
  images text[] not null default '{}',
  available integer not null default 1,
  sold_count integer not null default 0,
  featured boolean not null default false,
  rare_find boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists old_books_website_idx on public.old_books (website_id, featured);

alter table public.old_books enable row level security;

drop policy if exists "old_books_public_read" on public.old_books;
create policy "old_books_public_read" on public.old_books for select
  to anon, authenticated using (true);

drop policy if exists "old_books_admin_all" on public.old_books;
create policy "old_books_admin_all" on public.old_books for all
  to authenticated
  using (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (auth.jwt() ->> 'email') LIKE 'gauravsinghdata6%@gmail.com'
  )
  with check (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (auth.jwt() ->> 'email') LIKE 'gauravsinghdata6%@gmail.com'
  );

grant select on public.old_books to anon, authenticated;
grant insert, update, delete on public.old_books to authenticated;

-- ─── site_settings ───────────────────────────────────────────────────────────
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

drop policy if exists "site_settings_public_read" on public.site_settings;
create policy "site_settings_public_read" on public.site_settings for select
  to anon, authenticated using (true);

drop policy if exists "site_settings_admin_write" on public.site_settings;
create policy "site_settings_admin_write" on public.site_settings for all
  to authenticated
  using (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (auth.jwt() ->> 'email') LIKE 'gauravsinghdata6%@gmail.com'
  )
  with check (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (auth.jwt() ->> 'email') LIKE 'gauravsinghdata6%@gmail.com'
  );

grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;

-- ─── orders ──────────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  item_type text not null,
  item_title text,
  amount integer not null default 0,
  currency text not null default 'INR',
  razorpay_order_id text,
  razorpay_payment_id text,
  status text not null default 'pending' check (status in ('pending','completed','failed','refunded')),
  created_at timestamptz not null default now()
);

create index if not exists orders_user_idx on public.orders (user_id);
create index if not exists orders_status_idx on public.orders (status);

alter table public.orders enable row level security;

drop policy if exists "orders_read_own" on public.orders;
create policy "orders_read_own" on public.orders for select
  to authenticated using (user_id = auth.uid());

drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own" on public.orders for insert
  to authenticated with check (user_id = auth.uid());

drop policy if exists "orders_admin_all" on public.orders;
create policy "orders_admin_all" on public.orders for all
  to authenticated
  using (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (auth.jwt() ->> 'email') LIKE 'gauravsinghdata6%@gmail.com'
  )
  with check (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (auth.jwt() ->> 'email') LIKE 'gauravsinghdata6%@gmail.com'
  );

grant select, insert on public.orders to authenticated;
grant update, delete on public.orders to authenticated;

-- ─── coupons ─────────────────────────────────────────────────────────────────
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type text not null default 'percent' check (type in ('percent','fixed')),
  value integer not null default 0,
  max_uses integer,
  used_count integer not null default 0,
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.coupons enable row level security;

drop policy if exists "coupons_read_active" on public.coupons;
create policy "coupons_read_active" on public.coupons for select
  to authenticated using (active = true and (expires_at is null or expires_at > now()));

drop policy if exists "coupons_admin_all" on public.coupons;
create policy "coupons_admin_all" on public.coupons for all
  to authenticated
  using (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (auth.jwt() ->> 'email') LIKE 'gauravsinghdata6%@gmail.com'
  )
  with check (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (auth.jwt() ->> 'email') LIKE 'gauravsinghdata6%@gmail.com'
  );

grant select on public.coupons to authenticated;
grant insert, update, delete on public.coupons to authenticated;

-- ─── audit_logs ──────────────────────────────────────────────────────────────
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  resource text,
  resource_id text,
  ip_address text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs_insert_own" on public.audit_logs;
create policy "audit_logs_insert_own" on public.audit_logs for insert
  to authenticated with check (user_id = auth.uid() or user_id is null);

drop policy if exists "audit_logs_admin_read" on public.audit_logs;
create policy "audit_logs_admin_read" on public.audit_logs for select
  to authenticated
  using (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR (auth.jwt() ->> 'email') LIKE 'gauravsinghdata6%@gmail.com'
  );

grant select, insert on public.audit_logs to authenticated;

-- ─── admin_analytics view ────────────────────────────────────────────────────
create or replace view public.admin_analytics as
select
  (select count(*) from public.profiles)                                            as total_users,
  (select count(*) from public.subscriptions where status = 'active')               as active_subscriptions,
  (select count(*) from public.orders)                                              as total_orders,
  (select coalesce(sum(amount), 0) from public.orders where status = 'completed')   as total_revenue_paise,
  (select count(*) from public.research_papers where status = 'published')          as published_papers,
  (select count(*) from public.content_items where status = 'published')            as published_content,
  (select coalesce(sum(available), 0) from public.old_books)                        as books_in_stock;

grant select on public.admin_analytics to authenticated;

notify pgrst, 'reload schema';
