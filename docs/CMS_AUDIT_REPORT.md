# Master CMS Audit Report

**Scope:** Full end-to-end audit of the CMS managing Clarity Mode ("badly talks") and
Breakthrough Protocol. **Date:** 2026-07-01.

---

## 1. Critical finding: the CMS's entire backend didn't exist

The single biggest issue, discovered before any other testing could be meaningful:

**All 9 core CMS tables — `websites`, `content_items`, `testimonials`, `research_papers`,
`old_books`, `site_settings`, `orders`, `coupons`, `audit_logs` — did not exist in the
database the live app actually uses (`vajenjgxaznftlvribzl`).** They had been built
earlier against a different Supabase project by mistake. Practically, this meant:

- The website switcher ran entirely on a hardcoded fallback, never real data.
- Every content admin page (Research Papers, Testimonials, Old Books, Site Content,
  Library/Frameworks/Protocols/Templates, Orders, Coupons, Audit Logs) was trying to
  read/write tables that weren't there. Nothing saved through them could persist.

**Fix:** designed and created the complete schema in the correct project, matching the
existing admin UI code column-for-column (no frontend rewrites needed for the tables
themselves), with RLS + grants on every table, and seeded the two real website rows.
See `supabase/migrations/20260701_master_cms_schema.sql`.

---

## 2. Section-by-section audit

| Section | Status | Notes |
|---|---|---|
| **Dashboard** | ✅ Working | Real counts (users, orders, content, papers, sessions, testimonials) once schema existed. |
| **Content Management** (frameworks/protocols/templates/etc.) | ✅ Working (admin side) | ⚠️ No public page displays these types except `session` — see §3. |
| **Media Library** | ✅ Working | Read-only grid view of `content_items`; no upload capability — see §3. |
| **Books (Old Books Marketplace)** | ⚠️ Admin only | Full admin CRUD works; **zero public marketplace page exists** to browse/buy them. |
| **Research Papers** | ✅ Fixed this audit | Was 100% hardcoded fake data (`"12 papers"`, etc.) on the public page — see §3, fixed. |
| **Vault Content** | ❌ Architectural gap | Breakthrough Protocol is a separate deployed app on a **separate Supabase project** (confirmed this session). Content tagged for BP in this CMS has no path to that live site. |
| **Audio / Video Library** | ✅ Admin CRUD works | Only `type=session` has a real public renderer (`NetflixBrowse`); plain `audio`/`video`/`pdf`/etc. types are admin/DB-only. |
| **Testimonials** | ✅ Fully working | Confirmed end-to-end: submit → DB → public display, with real-content-only empty state. |
| **Categories** | ⚠️ No dedicated screen | Free-text field per content type, not a controlled list — prone to typos/duplicates (`"focus"` vs `"Focus"`). |
| **Tags** | ⚠️ No dedicated screen | Same — free-text tags per item, no site-wide tag management. |
| **Users** | ✅ Working | Real profiles + subscription plan badges. |
| **Authentication** | ✅ Fixed earlier this session | Cross-app session isolation, password reset flow. |
| **Payments / Orders** | ✅ Schema now real | `orders`/`coupons` tables created + granted; Razorpay/Stripe API routes pre-existing. |
| **Analytics** | ✅ Fixed this audit | Was querying a DB view (`admin_analytics`) that didn't exist — created it. |
| **Notifications** | ❌ Doesn't exist | No notification feature anywhere in the codebase. |
| **Search** | ❌ Doesn't exist | No cross-content search on the public site. Each admin table has a local, client-side text filter only — not a real search feature. |
| **Site Settings** | ✅ Working | Hero editor + 4 toggles, backed by the new `site_settings` table. |
| **Homepage Controls** | ⚠️ Partially wired | 4 toggles saved correctly but **none were ever read** by any component. Fixed `testimonials_on_home` this audit; `vault_enabled`/`navigator_enabled`/`applications_open` still need their target UI identified before wiring (see §5). |
| **Feature Controls** | ⚠️ Same as above | Same 4-toggle system. |
| **Navigation Controls** | ❌ Doesn't exist | Nav links are hardcoded in `Navbar.tsx`, not CMS-driven. |
| **SEO Controls** | ❌ Doesn't exist | Meta tags hardcoded in `index.html`; no per-page SEO management UI. |

---

## 3. Root causes and fixes applied

| # | Issue | Root cause | Fix |
|---|---|---|---|
| 1 | Entire CMS non-functional | Schema built against wrong Supabase project | Created full schema in the correct project (9 tables, RLS, grants, seed data) |
| 2 | Research page showed fake "12 papers" / "18 papers" counts | `ResearchPage.tsx` never queried `research_papers` — fully hardcoded | Rewrote to query real published papers, real per-category counts, real premium gating |
| 3 | Homepage toggles did nothing | Written to `site_settings` but never read anywhere | Wired `testimonials_on_home` into `Index.tsx` (others flagged, not guessed at) |
| 4 | Analytics page architecture | Queried `admin_analytics` view, which didn't exist | Created the view aggregating real counts across all tables |
| 5 | No file upload anywhere in the CMS | Every media field (cover/audio/video/pdf) is a manual URL-paste text input; **zero Supabase Storage buckets exist in this project** | Not fixed — flagged as the top recommended improvement (§5), since building real upload UI across 5 forms is a new feature, not a bugfix |

### Files modified
- `src/pages/ResearchPage.tsx` — real data instead of hardcoded categories
- `src/pages/Index.tsx` — wired `testimonials_on_home` toggle
- `supabase/migrations/20260701_master_cms_schema.sql` — full schema (new)

---

## 4. Live content verification (create → verify → clean up)

Per the requested test procedure, created one real item of each type through the exact
insert logic each admin page uses, verified it via the **exact query each real frontend
component uses** (not a generic check), then deleted it — nothing fake was left visible.

| Type | DB storage | Public visibility (real query match) | Edit | Delete |
|---|---|---|---|---|
| Audio (`content_items`) | ✅ | ✅ (RLS-visible; no dedicated public page renders this type) | ✅ | ✅ |
| Video/Session (`content_items`) | ✅ | ✅ **Full match** — verified against `NetflixBrowse`'s exact query | ✅ | ✅ |
| PDF Research Paper | ✅ | ✅ **Full match** — verified against the newly-fixed `ResearchPage` query | ✅ | ✅ |
| Book Entry (`old_books`) | ✅ | ✅ (RLS-visible; no public marketplace page exists) | ✅ | ✅ |
| Testimonial | ✅ | ✅ **Full match** — verified against `Testimonials.tsx`'s exact query | ✅ | ✅ |

Database confirmed clean afterward (0 test rows remaining).

**Caveat:** I don't have browser automation in this environment, so "frontend display" was
verified by replicating each component's exact Supabase query via direct REST calls with
the real anon key — not by rendering the page in an actual browser. Please do a quick
manual click-through to confirm visually.

---

## 5. Recommended improvements (not built — need your decision)

These are real, valuable gaps, but each is a **new feature**, not a bug fix, so I stopped
short of building them without your sign-off (matching the scope boundary the platform
already enforced once this session):

1. **Real file upload** (highest impact): add drag-drop upload → Supabase Storage → auto-
   filled URL, replacing the manual paste-a-URL fields across Content Items, Research
   Papers, Old Books, Testimonials, and Clarity Sessions. Requires creating storage
   buckets (currently zero exist) and upload components.
2. **Old Books public marketplace page** — admin can list books; nothing lets a visitor
   browse/buy them today.
3. **Generic content browser** for frameworks/protocols/templates/pdf/audio/video (i.e.
   everything except `session`) — or confirm these are meant only for the separate Vault
   app, in which case they need a genuine data bridge to that app's own database.
4. **Wire the remaining 3 toggles** (`vault_enabled`, `navigator_enabled`,
   `applications_open`) once you confirm exactly which UI element each should gate.
5. **Category/tag taxonomy** — a shared, controlled list instead of free-text per item.
6. **Site-wide search**, **Navigation Controls**, **SEO Controls**, **Notifications** —
   none exist today; each would be a new CMS section.

---

## 6. Database improvements made

- 9 tables created with RLS + grants (Postgres requires both — a recurring theme this
  session; every policy has a matching table-level grant).
- Consistent admin-check pattern across every table:
  `profiles.role = 'admin'` OR the founder's email as a fallback.
- Indexes on the columns every admin page actually filters/sorts by
  (`website_id, type`, `website_id, status`, etc.).
- `admin_analytics` view for single-query dashboard stats.

## 7. Mobile usability

No mobile-specific issues found in the CMS itself — all admin pages use the existing
responsive Tailwind classes (`hidden md:table-cell`, etc.) consistently. The bigger mobile
concern is upstream of the CMS: the whole app was made PWA-installable earlier this
session (see `docs/MOBILE_APP.md`), so admin work happens in the same responsive shell on
phone or desktop.

---

## 8. Production readiness score

| Area | Score |
|---|---|
| Database schema & permissions | 100% (was 0%) |
| Admin CRUD across all sections | 95% |
| Public-facing content pipeline | 60% — Sessions + Testimonials + Research Papers fully wired; Old Books, generic content types, and Vault content have no live consumer |
| Media/upload workflow | 20% — functional but entirely manual URL-paste, no storage integration |
| Site controls (homepage toggles, nav, SEO, search, notifications) | 35% — settings exist and 1 of 4 toggles is wired; nav/SEO/search/notifications don't exist |
| Single-admin operability | 80% — one person can manage Sessions, Testimonials, Research Papers, Users, Orders, Coupons today without touching code |

### **Overall: ~65% production-ready as a true single-source-of-truth CMS.**

The foundational, most critical work — a real, working database with correct
permissions — is done and verified. What's left is primarily **new feature work**
(file upload, a few missing public pages, a few unwired toggles), not bug-fixing. I
did not build these without checking with you, since each is a real scope decision
about what the CMS should do next, not a defect to silently patch.
