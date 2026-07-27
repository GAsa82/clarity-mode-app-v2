-- ============================================================================
-- Diary — admin-only personal knowledge engine
-- ============================================================================
-- Handwritten diary pages are uploaded as images, processed into structured
-- knowledge, and used to generate downstream assets (PDFs, audio scripts,
-- templates, insights, research papers).
--
-- Security posture: this is the owner's PERSONAL diary. Every table here is
-- admin-only for ALL operations — there is no "public read" path, unlike the
-- CMS content tables. Generated assets only become public if an admin
-- explicitly publishes them into the existing content_items/research_papers
-- tables, which have their own separate policies.
-- ============================================================================

-- Admin check, isolated so every policy below stays readable and consistent.
-- SECURITY DEFINER + pinned search_path matches the hardening already applied
-- to this project's other helper functions.
create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke execute on function public.is_admin_user() from anon;
grant execute on function public.is_admin_user() to authenticated;

-- Postgres marks array_to_string() STABLE, which disqualifies it from use in a
-- generated column — even though joining a text[] with a constant delimiter is
-- in fact deterministic. Wrapping the whole document build in a single
-- IMMUTABLE function is the standard way to express that to the planner.
create or replace function public.diary_search_doc(
  p_summary text,
  p_topics text[],
  p_keywords text[],
  p_tags text[],
  p_body text
)
returns tsvector
language sql
immutable
set search_path = public
as $$
  select setweight(to_tsvector('english', coalesce(p_summary, '')), 'A')
      || setweight(to_tsvector('english', coalesce(array_to_string(p_topics, ' '), '')), 'A')
      || setweight(to_tsvector('english', coalesce(array_to_string(p_keywords, ' '), '')), 'B')
      || setweight(to_tsvector('english', coalesce(array_to_string(p_tags, ' '), '')), 'B')
      || setweight(to_tsvector('english', coalesce(p_body, '')), 'C');
$$;

-- ─── Collections ────────────────────────────────────────────────────────────
create table if not exists public.diary_collections (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text unique,
  description  text,
  color        text default '#6366f1',
  sort         integer default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─── Pages ──────────────────────────────────────────────────────────────────
create table if not exists public.diary_pages (
  id                uuid primary key default gen_random_uuid(),
  collection_id     uuid references public.diary_collections(id) on delete set null,

  -- Source file
  image_path        text not null,           -- storage path inside the private bucket
  thumbnail_path    text,
  original_filename text,
  file_size_bytes   bigint,
  mime_type         text,
  -- SHA-256 of the file bytes. Duplicate uploads are detected against this
  -- rather than filename, which users routinely reuse (IMG_0001.jpg).
  content_hash      text,

  -- Ordering / provenance
  page_number       integer,
  entry_date        date,                    -- the date written ON the page, not upload date

  -- Processing lifecycle
  status            text not null default 'pending'
                    check (status in ('pending','processing','needs_review','processed','failed','archived')),
  status_message    text,
  processing_started_at timestamptz,
  processed_at      timestamptz,
  -- Low-confidence OCR is flagged for human review rather than silently
  -- accepted, so generated assets never rest on invented text.
  confidence        numeric(4,3) check (confidence is null or (confidence >= 0 and confidence <= 1)),

  -- Text
  ocr_text          text,                    -- raw machine output, kept for audit
  corrected_text    text,                    -- AI-corrected / human-edited working copy
  summary           text,

  -- Understanding
  topics            text[] not null default '{}',
  keywords          text[] not null default '{}',
  categories        text[] not null default '{}',
  tags              text[] not null default '{}',
  emotion           text,
  -- Structured extractions: lessons, ideas, quotes, action_items, frameworks,
  -- observations, stories, patterns. jsonb keeps this flexible as the
  -- extraction taxonomy evolves without a migration per category.
  extracted         jsonb not null default '{}'::jsonb,

  -- Bookkeeping
  version           integer not null default 1,
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- Full-text search across everything textual. Generated (not trigger-
  -- maintained) so it can never drift out of sync with the row.
  search_vector tsvector generated always as (
    public.diary_search_doc(summary, topics, keywords, tags, coalesce(corrected_text, ocr_text))
  ) stored
);

-- ─── Version history ────────────────────────────────────────────────────────
-- Every text edit is retained so an admin can always see what the machine
-- originally produced versus what a human changed.
create table if not exists public.diary_page_versions (
  id             uuid primary key default gen_random_uuid(),
  page_id        uuid not null references public.diary_pages(id) on delete cascade,
  version        integer not null,
  corrected_text text,
  summary        text,
  changed_by     uuid references auth.users(id) on delete set null,
  change_note    text,
  created_at     timestamptz not null default now(),
  unique (page_id, version)
);

-- ─── Knowledge graph links ──────────────────────────────────────────────────
create table if not exists public.diary_page_links (
  id           uuid primary key default gen_random_uuid(),
  from_page_id uuid not null references public.diary_pages(id) on delete cascade,
  to_page_id   uuid not null references public.diary_pages(id) on delete cascade,
  relation     text not null default 'related',
  strength     numeric(4,3),
  created_at   timestamptz not null default now(),
  check (from_page_id <> to_page_id),
  unique (from_page_id, to_page_id, relation)
);

-- ─── Generated assets ───────────────────────────────────────────────────────
create table if not exists public.diary_assets (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null
                check (kind in ('pdf','audio','template','insight','research_paper','article')),
  title         text not null,
  subtitle      text,
  -- Full generated body (script, markdown, sections…). Shape varies by kind.
  content       jsonb not null default '{}'::jsonb,
  -- Which diary pages this was derived from — the citation trail that makes
  -- every generated claim traceable back to a real handwritten page.
  source_page_ids uuid[] not null default '{}',

  file_path     text,                        -- rendered artifact in storage, if any
  file_size_bytes bigint,
  duration_sec  integer,

  status        text not null default 'draft'
                check (status in ('draft','review','approved','published','rejected','archived')),
  -- Set when an admin publishes this into the public CMS, so we can trace a
  -- live site item back to the diary page it came from.
  published_ref_table text,
  published_ref_id    uuid,

  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
create index if not exists diary_pages_status_idx        on public.diary_pages (status);
create index if not exists diary_pages_created_at_idx    on public.diary_pages (created_at desc);
create index if not exists diary_pages_entry_date_idx    on public.diary_pages (entry_date desc);
create index if not exists diary_pages_collection_idx    on public.diary_pages (collection_id);
create index if not exists diary_pages_content_hash_idx  on public.diary_pages (content_hash);
create index if not exists diary_pages_search_idx        on public.diary_pages using gin (search_vector);
create index if not exists diary_pages_topics_idx        on public.diary_pages using gin (topics);
create index if not exists diary_pages_tags_idx          on public.diary_pages using gin (tags);
create index if not exists diary_page_versions_page_idx  on public.diary_page_versions (page_id);
create index if not exists diary_page_links_from_idx     on public.diary_page_links (from_page_id);
create index if not exists diary_page_links_to_idx       on public.diary_page_links (to_page_id);
create index if not exists diary_assets_kind_idx         on public.diary_assets (kind);
create index if not exists diary_assets_status_idx       on public.diary_assets (status);
create index if not exists diary_assets_created_at_idx   on public.diary_assets (created_at desc);

-- ─── updated_at maintenance ─────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists diary_pages_touch on public.diary_pages;
create trigger diary_pages_touch before update on public.diary_pages
  for each row execute function public.touch_updated_at();

drop trigger if exists diary_assets_touch on public.diary_assets;
create trigger diary_assets_touch before update on public.diary_assets
  for each row execute function public.touch_updated_at();

drop trigger if exists diary_collections_touch on public.diary_collections;
create trigger diary_collections_touch before update on public.diary_collections
  for each row execute function public.touch_updated_at();

-- ─── RLS: admin-only, every table, every operation ──────────────────────────
alter table public.diary_collections   enable row level security;
alter table public.diary_pages         enable row level security;
alter table public.diary_page_versions enable row level security;
alter table public.diary_page_links    enable row level security;
alter table public.diary_assets        enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'diary_collections','diary_pages','diary_page_versions',
    'diary_page_links','diary_assets'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_admin_all', t);
    execute format(
      'create policy %I on public.%I for all
         using (public.is_admin_user()) with check (public.is_admin_user())',
      t || '_admin_all', t
    );
  end loop;
end $$;
