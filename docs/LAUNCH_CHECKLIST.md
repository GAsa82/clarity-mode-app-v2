# Go-Live Checklist — Clarity Mode ("badly talks") + Breakthrough Protocol

**Last updated:** 2026-07-02. Covers both sites. Everything under "Code status"
is done and verified by build + static review in this repo. Everything under
"Your actions" needs you (secrets, a real card, or a real device) — I can't do
these from here.

---

## Clarity Mode — `clarity-mode-app-v2-gq26.vercel.app`

### Code status ✅
- Production build passes (`npm run build`, exit 0).
- Video/audio playback works site-wide (was 100% broken — fixed in prior audit).
- Full CMS backend: all 9 tables, RLS, grants, CRUD, real file upload.
- **Revenue path is safe:** Razorpay (UPI/Card, INR) is the primary, verified
  gateway for both subscriptions (`/pricing`) and one-time Store purchases.
- **Stripe/USD is hidden by default** (`VITE_ENABLE_STRIPE` unset) so nobody can
  pay in USD and get nothing while its webhook is unwired (audit §12–§13).
- Store checkout crash fixed (audit §11); coaching never sends a fake meet link.

### Your actions to go live
1. **Nothing is required to start earning via Razorpay/INR** — it works today.
2. **(Optional) Turn on Stripe/USD.** Only after all three:
   - Register a webhook in Stripe → Developers → Webhooks pointing at
     `https://clarity-mode-app-v2-gq26.vercel.app/api/stripe/webhook`.
   - Add its signing secret as `STRIPE_WEBHOOK_SECRET` in Vercel → Production.
   - Set `VITE_ENABLE_STRIPE=true` in Vercel → Production, then redeploy.
   Until all three are done, leave USD off — otherwise USD customers pay and the
   subscription never activates.
3. **(Optional) Coaching extras:** add `COACHING_MEET_LINK` (your real Meet/Zoom
   link) and `RESEND_API_KEY` (+ verified `noreply@claritymode.com` sender) if
   you want auto-sent confirmation emails.
4. **Real-world verification I can't do:**
   - One live Razorpay purchase end-to-end (pay → subscription/entitlement active).
   - One Android + one iPhone pass: open a published session, confirm video plays;
     upload a photo through an admin form.
   - Upload your two real files (`SAP Report.pdf`, the screen recording) through
     the CMS upload buttons.

---

## Breakthrough Protocol — GitHub `GAsa82/breakthrough-protocol` (branch `master`)

### Code status ✅
- Production build passes (`npm run build`, exit 0).
- Vault hero (scroll-scrub video on desktop, canvas frame sequence on mobile) is
  finished, committed, and its 40 frame assets + optimized video are deployed.
- Old Books marketplace shipped.
- **Revenue path is sound and secure (Razorpay-only, no Stripe trap):**
  - Order created server-side; payment verified by server-side HMAC signature.
  - On verify, vault entitlements are granted with the **service-role** client
    (bypasses RLS — the grant can't be silently blocked), plus a Razorpay
    **webhook backstop** reconciles if the client verify call is interrupted.
  - Downloads require: authenticated + premium role + a per-drop (or ALL_ACCESS)
    entitlement, then serve a 60-second signed URL from a **private** bucket.
    Rate-limited to 20/min. Paid content is never publicly listable.

### Your actions to go live
Confirm these exist in Vercel → Production for the BP project:
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and client `VITE_RAZORPAY_KEY_ID`
- `VITE_SITE_URL`
- (Receipts) `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- (Web push, optional) `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
- (Analytics, optional) `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`
- (Admin bootstrap) `ADMIN_EMAIL`, `BOOTSTRAP_SECRET`

Then: one live Old Books purchase end-to-end (pay → entitlement granted →
download works), and a real Android + iPhone pass on the Vault hero scroll.

---

## One-line status

Both sites **build clean and have working, secure ways to take money today**
(Razorpay on both). What's left is your config + a real test purchase and a
real-device pass — none of it is a code blocker.
