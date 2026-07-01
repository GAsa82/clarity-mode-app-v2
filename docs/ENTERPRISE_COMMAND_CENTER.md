# Enterprise Command Center — Architecture & Roadmap

**For:** Clarity Mode ("badly talks") + Breakthrough Protocol
**Date:** 2026-07-02
**Author's stance:** grounded in the real code in this repo, not a wish-list.
Where something does not exist yet, it says so. Where I built it this session,
it's marked **✅ Shipped (Phase 1)**.

---

## 0. What already exists (the honest baseline)

This is **not** a basic admin panel. The current CMS (`/admin`) already has:

- A premium dark, glassy shell (`AdminLayout.tsx`) with framer-motion, a
  **multi-website switcher**, per-site + universal nav groups, and a Content
  Studio hub.
- **~22 admin modules**: Users, Subscriptions, Orders, Coupons, Content Studio,
  Research Papers, Old Books, Premium Library, Frameworks, Protocols, Templates,
  Clarity Sessions, Media Library, Site Content, Testimonials, Member
  Submissions, Analytics, Audit Logs, Coaching, Settings, Create Website.
- Real Supabase backend: RLS on all core tables, table grants, a service-role
  API layer (`api/`) with RBAC middleware, real file upload to Storage.
- Stack: **React 18 + Vite + TypeScript + Tailwind + shadcn/ui + framer-motion +
  @tanstack/react-query + recharts + cmdk + sonner + Supabase**, deployed on
  Vercel serverless, PWA-installable.

**The single most important architectural truth:** "manage both businesses from
one console" is only half-true today. The website switcher switches between two
**rows in one Supabase project** (Clarity's `vajenjgxaznftlvribzl`). The *live*
Breakthrough Protocol app runs on a **separate Supabase project**
(`llflerfeiwhicrmunqzw`) that this admin cannot currently read or write. A true
single command center for both requires **cross-project federation** (§1, §8).

---

## 1. Complete Architecture

### 1.1 Target shape — a "shell + modules + services" model

```
┌──────────────────────────────────────────────────────────────┐
│  COMMAND CENTER SHELL (AdminLayout)                           │
│  • Command Palette (⌘K)   • Global Action Center             │
│  • Website/Project switcher • Health rail  • Breadcrumbs      │
├───────────────┬──────────────────────────────────────────────┤
│  MODULE HOST  │  Executive Command Center (dashboard)         │
│  (route       │  Content Studio · Digital Asset Center        │
│   outlet)     │  Vault Ops · Site Builder · User Intelligence │
│               │  Automation · QA · Change Impact · Rollback   │
├───────────────┴──────────────────────────────────────────────┤
│  DATA / SERVICE LAYER                                         │
│  useCommandCenterMetrics (live)  │ react-query cache          │
│  api/* serverless (RBAC, service-role)                        │
│  Supabase: Postgres + RLS + Storage + Realtime + Edge Fns     │
├──────────────────────────────────────────────────────────────┤
│  FEDERATION: Project A (Clarity) ⇄ Project B (Breakthrough)   │
│  via a thin server-side gateway that fans queries out per     │
│  project and normalizes results (§8)                          │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 Data-access strategy
- **Reads for dashboards/lists:** move to `@tanstack/react-query` (already a
  dependency) with `staleTime`/`refetchInterval` for "live" panels. The new
  metrics hook (§below) uses a guarded polling pattern today; migrating it to
  react-query gives caching, dedup, and background refetch for free.
- **Writes/privileged ops:** always through `api/*` serverless with the
  service-role key + RBAC middleware — never the anon client. This is already
  the pattern in Breakthrough's `api/payments.ts` and should be the rule.
- **Cross-project:** a single `api/federation/*` gateway that accepts a
  `project` param, selects the right Supabase service client, and returns a
  normalized shape. The UI's project switcher then drives which project a module
  reads. This is the only correct way to "run both from one interface."

### 1.3 What shipped this session (Phase 1 foundation)
- **✅ Universal Command Palette** (`src/components/admin/CommandPalette.tsx`) —
  ⌘K/Ctrl+K anywhere in `/admin`, fuzzy search over every section + create
  actions + website switching + **live record search** (users, content, papers,
  books), degrades gracefully if any table is unreachable.
- **✅ Executive Command Center dashboard** (`AdminDashboard.tsx` +
  `useCommandCenterMetrics.ts`) — live revenue, users, new-signups (today/7d),
  published-today, orders, a **health rail** (Database/API/Storage/Auth/Search)
  with real latency probes, and honest alert tiles (pending/failed orders, audit
  events). Every value is real or shows "—"; nothing is faked.

---

## 2. UI/UX Redesign

Keep the existing premium dark language (it's already Apple-adjacent). Elevate,
don't replace.

| Area | Now | Target |
|---|---|---|
| Navigation | Sidebar links | Sidebar **+ ⌘K palette** (✅) as the primary jump surface |
| Dashboard | 6 static counts | **Live command center** with health rail + alerts (✅) |
| Density | Good | Introduce a shared `<StatCard>`, `<HealthDot>`, `<DataTable>` set so every module is visually identical |
| Motion | framer-motion in shell | Standardize: 150ms ease for hovers, layout animations for tab/section changes only (no gratuitous motion) |
| Theming | Forced dark (`main.tsx`) | Keep dark default; wire the existing `next-themes` provider to a real **light mode** toggle (vars already defined in `index.css`) |
| Empty/loading | Ad-hoc | One `<Skeleton>` + one honest `<EmptyState>` component reused everywhere |
| Global actions | Per-page buttons | **Global Action Center** in the top bar + palette "Create" group (✅ palette half) |

**Design tokens to formalize:** spacing scale (4/8/12/16/24), one radius scale
(lg=12, xl=16, 2xl=20), status palette (ok `#10b981` / degraded `#f59e0b` /
down `#ef4444` / idle `#64748b` — now used by the health rail), and typography
(display for headings, `text-sm` body, `text-xs` meta).

---

## 3. Missing Features Report

Ranked by leverage. **N** = not built; **P** = partial.

| # | Feature | State | Notes |
|---|---|---|---|
| 1 | Command Palette (⌘K) | ✅ **Shipped** | This session |
| 2 | Live executive dashboard + health | ✅ **Shipped** | This session |
| 3 | Cross-project federation (operate BP from here) | **N** | The big one — §1.2/§8 |
| 4 | Media processing (thumbnails, compression, transcoding) | **N** | Uploads store raw bytes as-is (per prior audit). Needs an Edge/serverless pipeline or a service like Mux/Cloudinary |
| 5 | Global search backend (cross-content) | **N** | Palette record search is per-table `ilike`; a real index (Postgres FTS or Typesense/Meilisearch) is the scalable answer |
| 6 | Scheduling / publish-later / expiration | **N** | No scheduler; needs a `scheduled_at` column + a cron Edge Function |
| 7 | Digital Asset Center (health, dupes, orphans, counts) | **P** | Media Library lists assets; no download/view/playback counts, no broken/duplicate/orphan detection |
| 8 | Vault Ops (featured/collections/continue-reading) drag-drop | **P** | Content exists; no ordering/curation UI |
| 9 | Site Builder (hero/banner/nav/footer no-code) | **P** | Site Content admin edits some fields; not a true block builder |
| 10 | User Intelligence (churn risk, journeys, cohorts) | **N** | Users list is CRUD; no behavioral analytics |
| 11 | Automation Center | **N** | §5 |
| 12 | QA Center (continuous tests) | **P** | Some vitest coverage in repos; no in-app QA runner/dashboard |
| 13 | Change Impact Engine | **N** | §6 |
| 14 | Rollback system | **P** | Git + Vercel deploys are the current rollback; no in-app content/DB restore |
| 15 | AI Operations Center | **N** | §5/§6 — realistic scope defined below |
| 16 | Notifications | **N** | Confirmed absent in prior audit |

---

## 4. Database Improvements

Concrete, safe, high-value schema work (all additive, RLS-guarded):

1. **`content_items.published_at timestamptz`** — the dashboard currently proxies
   "published today" off `created_at`. A real `published_at` (set on the
   draft→published transition) makes scheduling, "new releases", and analytics
   correct.
2. **`content_items.scheduled_at timestamptz` + status `scheduled`** — enables
   publish-later (§5). A cron Edge Function flips `scheduled`→`published` when
   due.
3. **Asset telemetry**: `asset_events(id, asset_id, type[view|download|play],
   user_id, created_at)` + rollups. Powers the Digital Asset Center counts (§3.7)
   without scanning storage.
4. **Soft-delete everywhere**: `deleted_at timestamptz` on content/media/orders
   instead of hard delete → enables one-click **Restore** (§ rollback) and an
   Archive view.
5. **`audit_logs` as the spine**: standardize actor/action/resource/old/new on
   every privileged write (Breakthrough already has this shape). Drives Change
   Impact history + Security Alerts.
6. **Materialized `admin_metrics` view** (or a scheduled rollup table) so the
   dashboard reads one row instead of ~14 count queries. Refresh on a cron.
   Keep `security_invoker`/admin-only (the prior audit already caught a view that
   leaked without it).
7. **Full-text search**: `tsvector` columns + GIN indexes on
   `content_items.title/description`, `research_papers.title`, `old_books.title`
   as the first real search backend (§3.5).
8. **Advisors**: run Supabase's security/perf advisors and fix the flagged
   mutable `search_path` functions noted in the prior audit.

---

## 5. Automation Roadmap

Realistic, phased — each item is a cron Edge Function + a small UI.

**Phase A (weeks):**
- **Scheduled publishing / expiration** — cron flips `scheduled_at`/expires
  content. UI: a date picker on every content form + a "Scheduled" queue.
- **Health monitoring** — the health rail (✅) promoted to a cron that writes
  results to a table + alerts on `down`.
- **Backups** — nightly `pg_dump`/Supabase backup verification + a storage
  manifest snapshot; surface "last good backup" on the dashboard.

**Phase B:**
- **Broken-link + missing-asset sweep** — cron walks content URLs + storage
  references, writes findings to `asset_events`/an issues table.
- **Media optimization pipeline** — on upload, an Edge Function generates a
  thumbnail + a compressed/derived rendition (image first; video via Mux/
  Cloudinary). Closes the biggest content-ops gap.
- **SEO audit** — cron checks titles/meta/OG per public page, scores them.

**Phase C (AI Operations — scoped to be real, not magic):**
- Feed the deterministic signals above (broken links, failed uploads, missing
  thumbnails, slow health probes, layout lint) to an LLM that **summarizes +
  suggests a fix**, always with the raw evidence and a human-approve step. AI
  triages; humans (or a reviewed automation) act. No silent AI writes to prod.

---

## 6. Stability Roadmap

- **Change Impact Engine (pre-flight):** a static map of `route → tables → api →
  components` (derivable by grepping imports + the route table). Before a
  content/schema change, show what it touches. v1 can be a generated JSON
  manifest surfaced in a modal; it needn't be dynamic to be useful.
- **QA Center:** wire the existing vitest suites into a dashboard, and add
  synthetic checks (login, signup, vault, a purchase dry-run, upload) that run
  post-deploy against production and report pass/fail on the command center.
- **Rollback:** (a) content/DB via soft-delete + point-in-time restore
  (Supabase PITR on a paid tier); (b) deploys via the existing Vercel
  git-integration ("Promote previous"); (c) settings via a versioned
  `site_settings` history. Surface all three as one-click actions.
- **Error surfacing:** adopt an error boundary per module + Sentry (or Supabase
  logs) so "Failed Actions" on the dashboard is a real feed, not a proxy.
- **Guardrails:** the payment fail-safe pattern from this repo (feature-flag a
  path that can silently take money and deliver nothing) is the model — every
  irreversible action gets a confirm + an audit row.

---

## 7. Mobile Admin Experience

The shell is already responsive (mobile drawer sidebar). To make it a true
mobile command center:
- **Palette-first on mobile:** ⌘K → a full-screen search sheet is the fastest
  nav on a phone (the trigger is already in the top bar).
- **Card layouts over tables:** every `<DataTable>` collapses to stacked cards
  under `md` (some pages already do `hidden md:table-cell`; standardize it).
- **PWA install for admins** (the app is already PWA-capable) so ops can add the
  command center to their home screen.
- **Thumb-reachable Action Center**: the Global Action Center as a bottom sheet
  on mobile.
- **Approve-on-the-go**: Member Submissions, coaching confirmations, refunds —
  the highest-value "do it from your phone" actions — get one-tap approve/deny.

---

## 8. Enterprise Scalability Roadmap (single operator → 100+ team)

1. **Cross-project federation gateway** (§1.2) — the prerequisite for one console
   over both businesses, and for adding a 3rd/4th property later.
2. **RBAC → fine-grained roles + teams:** today it's admin/super_admin. Add
   roles (editor, finance, support, read-only), per-module permissions, and an
   invite/seat system. Breakthrough's `_rbac.js` role ladder is the seed.
3. **Audit everything** (already the pattern) → compliance-ready trail.
4. **Search & lists at scale:** move from `ilike` to a real index (Postgres FTS
   first, Typesense/Meilisearch if volume demands); cursor pagination everywhere.
5. **Read scaling:** materialized metrics + react-query caching + Supabase read
   replicas on a paid tier.
6. **Multi-tenant config:** per-website settings, branding, and feature flags
   (the `websites` table + `site_settings` already model this).
7. **CI/CD gates:** typecheck + vitest + a smoke suite must pass before the
   Vercel promote; the QA Center reads those results.
8. **SLOs on the health rail:** turn the probes into tracked uptime/latency SLOs
   with alerting.

---

## 9. Production Readiness Score

Scored as *command-center capability*, not just "does the app run."

| Module | Score | Basis |
|---|---:|---|
| Admin shell / navigation | 90% | Premium shell + **⌘K palette shipped** |
| Executive dashboard | 85% | **Live metrics + health rail shipped**; needs materialized rollup + real `published_at` |
| Content CRUD (all modules) | 80% | ~22 modules, real RLS/upload; UX not yet unified into shared primitives |
| Command / discoverability | 85% | Palette covers every section + live records |
| Revenue / commerce ops | 80% | Orders/subs/coupons real; needs refund + LTV/cohort views |
| Digital Asset management | 45% | Lists assets; no processing, counts, or orphan/dupe detection |
| Search | 25% | Per-table `ilike` in palette; no real index |
| Automation / scheduling | 15% | None yet; roadmap in §5 |
| QA / Change-impact / Rollback | 30% | Git+Vercel rollback only; engines in §6 |
| Cross-project (operate BP here) | 20% | Switcher is intra-project; federation is §1/§8 |
| Mobile admin | 70% | Responsive shell; needs card tables + action sheet |
| Security posture | 85% | RBAC + RLS + audit + payment fail-safe; fix advisor `search_path` items |

### Overall command-center readiness: **~62%**
Up meaningfully from the pre-session baseline because the two signature,
highest-leverage pieces — **the Universal Command Palette and the live Executive
Command Center** — are now real and shipping, not mocked. The path from 62% →
90% is well-defined and phased above; the highest-ROI next steps are (1) a shared
component system so all 22 modules feel identical, (2) `published_at` +
materialized metrics, and (3) the cross-project federation gateway that finally
makes "operate both businesses from one screen" literally true.

---

## Appendix — files added/changed this session

- `src/components/admin/CommandPalette.tsx` — Universal Command Palette (new)
- `src/hooks/useCommandCenterMetrics.ts` — live metrics + health probes (new)
- `src/pages/admin/AdminDashboard.tsx` — rebuilt as the Executive Command Center
- `src/components/AdminLayout.tsx` — mounts the palette + top-bar ⌘K trigger
- `docs/ENTERPRISE_COMMAND_CENTER.md` — this document
