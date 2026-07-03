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

---

## 9. Update — subsequent audit rounds (2026-07-01, continued)

The `/loop` continued auditing after this report was first written. Summary of
everything found and fixed since, newest-relevant first:

### Fixed
- **Real file upload was built** — item 1 from §5 above is done. A `cms-media`
  storage bucket + a reusable upload component with live progress now replace
  manual URL-paste across all 5 content forms.
- **Video/audio playback was completely non-functional site-wide** (the single
  most severe bug found in the whole audit) — `ContentPreviewModal` never
  received `video_url`/`audio_url` from the database at all. Fixed with a real
  `<video>`/`<audio>` player gated by premium/subscription status. The fake
  hardcoded "Now Playing" widget (simulated progress bar, no real audio) and
  the always-fake featured banner were fixed to use real data too.
- **`admin_analytics` (built in §1) had a real security hole** — missing
  `security_invoker` meant any logged-in user, not just admins, could query
  business metrics via the API directly. Fixed and verified.
- **The entire Users admin page only ever showed the admin's own account** —
  `profiles` had no admin-read-all RLS policy. Fixed with a `SECURITY DEFINER`
  helper (a naive self-referential policy causes infinite recursion).
- **Subscriptions admin page was silently empty** — a PostgREST embed relied on
  a foreign key relationship that doesn't exist. Rewritten to join client-side.
- **Real store purchases would have failed** — `orders` was missing 2 columns
  the actual checkout code requires. This is real money; fixed and verified.
- **"Save Session" button did nothing** — built a real, account-backed
  `saved_sessions` table and wired it up (found via real device testing).
- **Razorpay payments were failing in production** — root cause was empty/then
  incorrectly-named environment variables in Vercel (multi-round live
  debugging with the user, resolved and verified against the live bundle).
- **Coupons were built but 100% disconnected from checkout** — an admin could
  create discount codes no customer could ever use. Built real server-side
  validation, discount math, and usage tracking into the Store checkout flow.
- **Two `AdminSettings.tsx` bugs**: a role-check typo (`"superadmin"` vs. the
  real `"super_admin"`) hid real super-admins from the admin list; a
  "Clear All Data" danger-zone button was dangerously mislabeled — it only
  ever touched two orphaned legacy tables, never real content. Fixed both.
- **Newsletter signup silently lied about success** — localStorage-first
  optimistic UI meant a failed database write still told the user "you're
  subscribed," and a failed attempt permanently blocked retries. Rewritten so
  the real API call is the source of truth.
- **2 of 5 Content Studio "Quick Actions" were dead ends** — Research Papers
  and Old Books didn't read the `?new=1` query param their own links promised.

### Audited, no bugs found (ruled out, not skipped)
Stripe checkout/portal/webhook, Focus Room matchmaking (grants, RLS, and the
subtle cross-user visibility it needs), `api/coaching/bookings.js` and
`slots.js`, `ContentStudioPage.tsx`'s navigation.

### Found, deliberately not built (flagged for your decision)
- **`confessions`/`confession_reactions`/`confession_replies`** have fully
  working database tables and RLS policies but zero frontend anywhere — an
  entire built backend for a feature with no UI, not a bug to patch.
- **`diaries`/`diary_entries`** turned out to be orphaned infrastructure from
  the removed AI Coach feature (`file_id`, `chunk_index`, `embedding`,
  `emotions` — a document-analysis pipeline, not a journal table). Dashboard's
  simple journal notes are localStorage-only, which is fine for that lighter
  use case; forcing them into the heavyweight AI schema would have been wrong.

### Updated readiness score: **~80%** (was ~65%)
The jump reflects fixing the single most severe bug (broken playback),
closing a real security hole, and fixing 3 additional silent-failure bugs that
would have cost real revenue or user trust (orders schema, coupons, Razorpay
env vars). Remaining gaps are unchanged from §5 above — mostly bigger feature
decisions (Old Books marketplace, generic Vault browser, Confessions UI, the
3 unwired toggles) that need your input before building, not defects to fix.

## §10 Update — dead-code sweep (AI Coach remnants)

- **Removed 4 admin pages that were pure dead code**: `AdminUpload.tsx`,
  `AdminKnowledge.tsx`, `AdminTraining.tsx`, `AdminDocuments.tsx`. None were
  reachable from `AdminLayout`'s nav — URL-only routes left over from the
  removed AI Coach feature. All three of Upload/Knowledge/Training imported
  from `src/lib/clarity-ai-api.ts`, which was already a non-functional stub;
  that file is now fully orphaned and was deleted too.
- **Two of the four contained fabricated data displayed as real stats** —
  a direct violation of this project's real-data-only rule:
  - `AdminTraining.tsx` had `useState(42)` for "indexed docs" and a fake job
    history list with a `// Simulate progress` comment.
  - `AdminDocuments.tsx` had a literal `demoDocuments` array (6 invented
    filenames/sizes/dates) whose fake sizes were summed into a "Total Size"
    stat shown to the admin as if it were real.
  Since neither page was reachable through the UI, this was latent rather
  than actively misleading anyone — but it would have misled whoever typed
  the URL directly, including a future admin or a subsequent audit.
- Verified clean removal: `npx tsc --noEmit` passes with zero errors,
  `npm run build` succeeds, and the 4 removed chunks no longer appear in the
  build output. Committed and pushed (`a7a4ea1`).
- **Housekeeping**: deleted two stray local `.txt` scratch files
  (`build-output.txt`, `repo-search.txt`) left over from earlier terminal
  redirects — untracked, unreferenced, no value.
- **Found, not touched — needs your call**: `public/SAP Report.pdf` (380 KB)
  and `public/Screen Recording 2025-07-13 214144.mp4` (119 MB) sit directly
  in the static `public/` folder, **untracked by git** (never committed, so
  not currently live on the deployed site) and **not referenced anywhere in
  the code**. These look like your own local test files for the "recently
  uploaded test content" you mentioned, placed straight into `public/`
  instead of going through the CMS's real media upload flow — so right now
  they're neither a working part of the CMS nor cleaned up. I didn't delete
  or move them since they may be files you still want (the PDF in particular
  could be sensitive). Your call: (a) delete both, (b) actually upload them
  through the CMS's Media Library so they become real, tracked content, or
  (c) leave as-is. Flagging so it doesn't stay invisible.
- **Diary feature status re-confirmed**: `diaries`/`diary_entries` remain
  orphaned AI-Coach-era schema with no frontend consumer anywhere in `src/`
  — this round's search turned up nothing beyond what §9 already documented.
  No dead frontend files to remove here (unlike the AdminUpload cluster)
  since no UI was ever built against these tables in the first place. Left
  the DB tables untouched (Postgres schema changes aren't reversed just
  because a UI never landed); the "Clear Diary & Upload History" admin
  button (§9) still legitimately targets them.
- **Self-caught regression**: removing the 4 admin pages above broke 3 links
  that pointed at them from elsewhere — `FounderStudio.tsx` linked to
  `/admin/upload` ("Upload Content"), `/admin/documents` ("Diary Pages" —
  mislabeled even before removal; `AdminDocuments` was never a diary
  feature), and `/admin/knowledge` ("AI Knowledge Base"); `founder-ai.ts`'s
  AI Command Center had an entire deterministic "knowledge" intent whose
  only action navigated to the same dead `/admin/knowledge` route. Caught by
  grepping for the route **path strings** (not just the component names)
  after the fact, re-pointed the two salvageable links at real destinations
  (Media Library, Clarity Sessions) instead of inventing a replacement
  feature, and deleted the knowledge intent outright. Also removed
  `Diary`/`UploadHistoryEntry` types in `supabase.ts` — same orphaned schema,
  zero importers. Verified with a second typecheck + build, then shipped
  (`3ee6a53`). **Process lesson for future dead-code removals in this repo**:
  grep for the route's path string across all of `src/`, not just the
  component/page name — a page can be de-registered while other pages still
  link to its URL by string literal.

## §11 Update — CRITICAL: Store checkout was 100% broken (real revenue)

Reported from a live device: "Couldn't start checkout / Failed to create
order" on the ₹2,899 Confidence Rebuild Blueprint (and every Store product).

- **Root cause**: `api/razorpay/purchase.js` was the *only* file in `api/`
  reading `process.env.SUPABASE_URL`. Every other API file — and the actual
  Vercel production env — uses `VITE_SUPABASE_URL`. With `SUPABASE_URL`
  undefined, the module-level `createClient(undefined, serviceRoleKey)` threw
  at *import time*, so the entire serverless function crashed with
  `FUNCTION_INVOCATION_FAILED` before a single line of handler code ran. No
  Store product could ever be purchased.
- **Why it masqueraded as a clean server error**: the crash returns a
  non-JSON 500 body. The frontend (`Store.tsx`) does
  `res.json().catch(() => ({}))` then `throw new Error(body.error || "Failed
  to create order")` — so it fell back to its own default string, which
  happens to be *identical* to the handler's own line-91 500 message. The
  toast looked like a graceful handler error but was actually a hard crash.
- **Fix**: one line — `SUPABASE_URL` → `VITE_SUPABASE_URL` (`6ce3334`).
  Verified by polling the live endpoint until an unauthenticated POST
  returned a clean `{"error":"Unauthorized"}` 401 (function now initialises)
  instead of `FUNCTION_INVOCATION_FAILED`.
- **Keys, separately confirmed**: validated the live Razorpay key pair with a
  read-only `GET /v1/orders` (HTTP 200; account already holds a real order),
  and re-set the production server `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` to
  that confirmed-good pair as belt-and-suspenders (client `VITE_RAZORPAY_KEY_ID`
  was already correct in the shipped bundle). Keys were a red herring — the
  crash was the real blocker — but they're now verified end-to-end correct.
- **Still needs a real authenticated purchase to close out** (can't mint a
  user token from here): all server-side pieces are now verified, but the
  final confirmation is the user completing one live Store checkout.
- **Process lesson**: a hard serverless module-load crash can be silently
  reshaped into a *graceful-looking* error by the frontend's own JSON-parse
  fallback. When a "clean" API error message is suspiciously generic, check
  the raw HTTP status/body — `FUNCTION_INVOCATION_FAILED` vs. real JSON tells
  you whether the handler even ran.

## §12 Update — env-var sweep across ALL serverless functions

Prompted by §11, I cross-referenced every `process.env.*` referenced in
`api/` against the actual Vercel **production** env (`vercel env ls
production`). Three referenced vars are **missing from production** — the same
bug class that just broke checkout. Each needs the admin to add the value
(I can't supply Stripe/Resend/Meet secrets), but I fixed the code half where
one existed.

| Env var | Read at | Missing-in-prod impact | Status |
|---|---|---|---|
| `STRIPE_WEBHOOK_SECRET` | `api/stripe/webhook.js:30` | **CRITICAL.** "Pay with Card (USD)" (Stripe) is shown to every user on `/pricing`. Checkout session creation works (`STRIPE_SECRET_KEY` present), the customer pays, but the `checkout.session.completed` webhook calls `stripe.webhooks.constructEvent(body, sig, undefined)` → throws → 400 → **subscription is never activated**. Customer pays and gets nothing. (Also requires a webhook endpoint to be registered in the Stripe dashboard pointing at `/api/stripe/webhook`.) | ⛔ **Needs admin**: add `STRIPE_WEBHOOK_SECRET` to Vercel prod + register the webhook endpoint in Stripe. Until then, consider hiding the USD/Stripe button (Razorpay/INR works). |
| `COACHING_MEET_LINK` | `api/coaching/verify.js` | **HIGH.** ₹3,000 coaching customers were sent a hardcoded dead placeholder link (`https://meet.google.com/your-meeting-link`) in their confirmation email, and it was stored in `coaching_sessions.meet_link`. | ✅ **Code fixed** (`ccc7862`): no fake link is ever stored/emailed/returned; customer told the link arrives by email. ⚠️ Still add `COACHING_MEET_LINK` (your real Meet/Zoom link) to Vercel prod so the real link auto-appears. |
| `RESEND_API_KEY` | `api/coaching/verify.js:104` | **MEDIUM.** Cleanly guarded (`if (process.env.RESEND_API_KEY)`), so no crash — but coaching confirmation emails simply never send. | ⚠️ **Needs admin**: add `RESEND_API_KEY` from a Resend account (and verify the `noreply@claritymode.com` sender domain) if confirmation emails are wanted. |

**All other API env references are present and correct** in production
(`RAZORPAY_KEY_ID/SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_*`,
`SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SITE_URL`).

**Admin action list (values only you can supply), add to Vercel → Production:**
1. `STRIPE_WEBHOOK_SECRET` — from Stripe Dashboard → Developers → Webhooks
   (create an endpoint → `https://clarity-mode-app-v2-gq26.vercel.app/api/stripe/webhook`,
   copy its signing secret). **Or** drop the USD/Stripe option entirely if
   you only want INR/Razorpay.
2. `COACHING_MEET_LINK` — your real recurring Google Meet / Zoom link.
3. `RESEND_API_KEY` — only if you want automated coaching confirmation emails.

## §13 Update — Stripe/USD fail-safe: hidden until its webhook is wired

Acting on §12's CRITICAL finding (the "Pay with Card (USD)" button was the
*primary* CTA on `/pricing`, yet with `STRIPE_WEBHOOK_SECRET` missing in prod a
USD customer would pay and never get their subscription activated), I made the
site fail safe for launch instead of leaving a money-losing path live.

- **Change**: the Stripe/USD button now renders only when
  `import.meta.env.VITE_ENABLE_STRIPE === "true"`. The flag defaults **off**, so
  by default only the verified-working Razorpay/INR gateway is shown, and it is
  promoted from the small secondary button to the primary CTA. The footer
  gateway note and `.env.example` were updated to match. (`PricingPage.tsx`,
  `.env.example`.)
- **Why a flag, not a deletion**: fully reversible. Nothing about the Stripe
  integration was removed — `handleStripe`, `api/stripe/*`, and the plan pricing
  are all intact. The moment the admin (a) registers the webhook endpoint in the
  Stripe dashboard, (b) adds `STRIPE_WEBHOOK_SECRET` to Vercel prod, and (c) sets
  `VITE_ENABLE_STRIPE=true`, the USD button returns exactly as before.
- **Net effect**: the site can launch and take money *today* via Razorpay with
  zero risk of charging a card and delivering nothing. USD is a one-flag switch
  away once its webhook is verified.
- **Verified**: production build passes with the gate in place (Stripe hidden);
  the Razorpay subscription path and the §11-fixed Store one-time checkout are
  unchanged and remain the live revenue paths.

## §14 Update — Vault removed + Supabase security-advisor hardening

**Vault removed (commit `5ef6747`, verified live).** Per the owner's decision,
all cross-site redirection to Breakthrough Protocol was deleted — `vault-config`,
`VaultContext` (the `window.location.href` redirect), the transition, and the
VaultUnavailable page/route are gone; the nav "Vault" item, footer Ecosystem
link, and the homepage hero's external CTA (now → `/research`) are removed.
Confirmed on the live bundle: no "vault" text, no `breakthrough-protocol.../vault`
path. Clarity is now fully self-contained. (SSO was considered and dropped — see
memory `cross-app-login-architecture`.)

**Ran the Supabase security advisor and fixed the real items**
(migration `20260702_launch_security_hardening.sql`). Went from ~30 lints to ~10.

Fixed:
- **`coaching_sessions` open INSERT (real fraud/DoS)** — the policy let any anon
  POST a `payment_status='paid'` row: a free fake booking, or mass-inserts to
  occupy every slot and DoS the paid coaching calendar. Dropped it; legit
  bookings insert server-side via the service role. ✅
- **`coaching_followups` open INSERT** — server-seeded only; dropped. ✅
- **`newsletter_subscribers` open INSERT** — real signups go through
  `/api/subscribe` (service role); dropped the raw anon INSERT so junk emails
  can't be bulk-inserted straight into the list (protects sender reputation).
  Table is now server-only (advisor shows a benign INFO "no policy"). ✅
- **11 functions with mutable `search_path`** — pinned to `= public` (matches
  the already-pinned helpers; all reference only public objects). ✅
- **`handle_new_user()` RPC-callable** — revoked EXECUTE from anon/authenticated;
  it's a signup trigger, which still fires (triggers ignore caller EXECUTE). ✅

Accepted / deferred (documented, not blockers):
- **SECURITY DEFINER RPC-executable**: `is_premium`, `get_user_plan`,
  `is_admin_user` MUST stay executable — RLS policies call them. `face_payment_required`
  is a harmless boolean; `increment_match_count` is used by matchmaking. Left as-is.
- **`confessions` / `confession_reactions` / `confession_replies` open anon INSERT**:
  an unused, UI-less feature whose policy names ("Anyone can post a confession")
  suggest deliberate anonymous design. Left as-is — **before building a
  confessions UI, add auth and/or rate-limiting** or it's a public spam endpoint.
- **`cms-media` public bucket allows listing**: low-severity info-disclosure
  (filename enumeration). Left untouched to avoid any risk to media serving on
  launch; tighten the bucket SELECT policy later if desired.

**Owner action (dashboard only, can't be done from code):**
- **Enable Leaked Password Protection** — Supabase → Authentication → Policies →
  turn on "Leaked password protection" (checks HaveIBeenPwned). One toggle.

## §15 Update — live smoke test + performance advisor

**Live smoke test (all pass).** Every public route returns HTTP 200 on the live
deployment: `/`, `/pricing`, `/research`, `/insights`, `/about`, `/contact`,
`/coaching`, `/login`, and the three payment-processor-required legal pages
`/privacy`, `/terms`, `/refunds`. (It's an SPA so 200 = shell serves; the legal
routes are real lazy-loaded pages that build cleanly.) Razorpay business accounts
require Terms/Privacy/Refunds/Contact to be publicly reachable — they are.

**Performance advisor: 131 lints, triaged for a pre-launch (~0 traffic) DB.**
- ✅ **Fixed — 11 `unindexed_foreign_keys`**: added covering indexes
  (`20260702_fk_covering_indexes.sql`) on audit_logs.user_id,
  coaching_followups.session_id, coaching_sessions.user_id,
  coaching_testimonials.session_id, payments.subscription_id, rooms.created_by,
  saved_sessions.content_item_id, sessions.partner_id, upload_history.diary_id,
  and user_reports.(reported_id, room_id). Zero correctness risk; helps joins and
  cascade deletes as data grows.
- ⏸️ **Deferred — 57 `auth_rls_initplan` + 36 `multiple_permissive_policies`
  (WARN)**: these are real *at-scale* optimizations (wrap `auth.uid()` in
  `(SELECT auth.uid())`; consolidate overlapping policies), but bulk-rewriting 57
  live RLS policies immediately before launch carries genuine access-control
  regression risk for **zero present benefit** (no traffic). Deliberately left
  for a dedicated, tested pass once there's real load. Not a launch blocker.
- ⏸️ **Ignored — 27 `unused_index` (INFO)**: "unused" only because the DB has no
  query history yet (pre-launch). Dropping them would be wrong; they'll register
  as used once traffic arrives.

**Bottom line:** Clarity is launch-ready on the axes I can verify — pages live,
legal pages present, checkout working (Razorpay), risky USD path safely gated,
security holes closed, FK indexes in place. Remaining items are owner-side
toggles/keys (leaked-password protection; the §12 env vars) and at-scale perf
tuning that should wait for real traffic.

## §16 Update — content readiness + SEO/social metadata

**⚠️ Biggest real gap to "earning money": the site is nearly empty of content.**
Live DB counts (project vajenjgxaznftlvribzl):
- research_papers: **1** · content_items: **1** (a single session; **0** library
  PDFs/frameworks/protocols/templates) · old_books: **0** · testimonials: **0** ·
  coupons: **0** · approved Member-of-the-Day: 2.
This is **not a code bug** — it's content the owner must add through the admin
CMS (Content Studio), and per the project's real-data-only rule I did not seed
anything. The **Store works** (its 4 products are defined in `Store.tsx`), but
`/research` shows one paper and the Library is empty. **Action: before/at launch,
add real research papers, library items, and ideally a few testimonials via
`/admin`.** Empty states are handled gracefully (e.g. Testimonials shows an
honest "No reviews yet — be among our first" card, reinforcing no-fake-reviews),
so an empty site looks intentional rather than broken — but there's little to
convert on until content exists.

**SEO / social — mostly good, fixed one real bug:**
- ✅ `robots.txt` allows all crawlers; `og-image.png`, favicon, apple-touch icons
  all present and 200. Title, description, viewport, PWA/splash tags all solid.
- ✅ **Fixed**: `og:description` and `twitter:description` still advertised the
  **removed AI-coach feature** ("An AI coach that helps you discover emotional
  patterns…"). Anyone sharing a link got a preview for a product that no longer
  exists. Rewritten to match the real offering (research papers, audio sessions,
  frameworks, protocols). (`index.html`.)
- ⚠️ **Owner decision — domain**: `canonical`, `og:url`, and `og:image` all point
  to `https://claritymode.com/`. If that's the real launch domain, connect it in
  Vercel; if launching on the `*.vercel.app` URL, these tags need updating or
  social/search will reference a domain that may not resolve. Left as-is pending
  your confirmation.
- ℹ️ Minor: no real `sitemap.xml` (the 200 is the SPA fallback). Optional; a
  static sitemap would help indexing once content exists.
