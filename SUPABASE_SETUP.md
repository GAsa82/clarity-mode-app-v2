# Clarity Mode — Supabase Setup Guide

## Step 1 — Run SQL migrations (in order)

Go to: **Supabase Dashboard → SQL Editor → New query**

Run each file **in order**:

### 1. `supabase/migrations/20260001_profiles.sql`
Creates the `profiles` table, auto-create-profile trigger, and RLS.

### 2. `supabase/migrations/20260002_subscriptions.sql`
Creates the `subscriptions` table (one row per user) with RLS.

### 3. `supabase/migrations/20260003_payments.sql`
Creates the `payments` table (one row per transaction) with RLS.

### 4. `supabase/migrations/20260004_functions.sql`
Creates helper functions:
- `is_premium(uid)` → boolean
- `get_user_plan(uid)` → 'free' | 'premium' | 'annual'
- `upsert_subscription(...)` — used by webhooks
- `record_payment(...)` — used by webhooks

### 5. `supabase/migrations/20260701_admin_role_migration.sql`
Migrates any legacy admin email(s) into `public.profiles` and ensures the corresponding profile role is set to `admin`.

---

## Step 2 — Get your service_role key

Go to: **Supabase Dashboard → Settings → API → Project API keys**

Copy the **service_role** key (starts with `eyJ...`).

Add it to Vercel environment variables as:
```
SUPABASE_SERVICE_ROLE_KEY = eyJ...your_service_role_key...
```

---

## Step 3 — Deploy Edge Functions (optional — Vercel functions work too)

If you want to use Supabase Edge Functions instead of Vercel API routes:

```bash
# Login
npx supabase login

# Link to your project (project ref = vajenjgxaznftlvribzl)
npx supabase link --project-ref vajenjgxaznftlvribzl

# Set secrets for Edge Functions
npx supabase secrets set STRIPE_SECRET_KEY=sk_live_...
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
npx supabase secrets set RAZORPAY_KEY_SECRET=your_secret

# Deploy each function
npx supabase functions deploy stripe-webhook
npx supabase functions deploy razorpay-verify
npx supabase functions deploy get-subscription
```

Edge Function URLs will be:
- `https://vajenjgxaznftlvribzl.supabase.co/functions/v1/stripe-webhook`
- `https://vajenjgxaznftlvribzl.supabase.co/functions/v1/razorpay-verify`

---

## Step 4 — Vercel environment variables

Add ALL of these in **Vercel Dashboard → Settings → Environment Variables**:

```
# Supabase
VITE_SUPABASE_URL            = https://vajenjgxaznftlvribzl.supabase.co
VITE_SUPABASE_ANON_KEY       = eyJ...anon_key...
SUPABASE_SERVICE_ROLE_KEY    = eyJ...service_role_key...

# Stripe (https://dashboard.stripe.com)
VITE_STRIPE_PUBLISHABLE_KEY  = pk_live_...
STRIPE_SECRET_KEY            = sk_live_...
STRIPE_WEBHOOK_SECRET        = whsec_...
STRIPE_PRICE_MONTHLY         = price_...   (create in Stripe → Products)
STRIPE_PRICE_ANNUAL          = price_...   (create in Stripe → Products)

# Razorpay (https://dashboard.razorpay.com/app/keys)
VITE_RAZORPAY_KEY_ID         = rzp_live_...
RAZORPAY_KEY_ID              = rzp_live_...
RAZORPAY_KEY_SECRET          = ...

# Site
VITE_SITE_URL                = https://clarity-mode-app-v2-gq26.vercel.app
```

---

## Step 5 — Stripe webhook endpoint

In **Stripe Dashboard → Webhooks → Add endpoint**:

- URL: `https://clarity-mode-app-v2-gq26.vercel.app/api/stripe/webhook`
- Events to listen for:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`

Copy the **Signing secret** → add as `STRIPE_WEBHOOK_SECRET` in Vercel.

---

## Step 6 — Create Stripe products & prices

In **Stripe Dashboard → Products → Add product**:

1. **Premium Monthly**
   - Price: $12.00 / month (recurring)
   - Copy the Price ID → `STRIPE_PRICE_MONTHLY`

2. **Premium Annual**
   - Price: $89.00 / year (recurring)
   - Copy the Price ID → `STRIPE_PRICE_ANNUAL`

---

## Step 7 — Verify setup

After running all SQL, test in Supabase SQL Editor:

```sql
-- Should return 'free' for a user with no subscription
SELECT public.get_user_plan('YOUR_TEST_USER_UUID');

-- Should return FALSE
SELECT public.is_premium('YOUR_TEST_USER_UUID');

-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'subscriptions', 'payments');
```

---

## Database schema summary

```
auth.users (Supabase built-in)
  └── profiles       (id, email, name, role)
  └── subscriptions  (user_id, plan, status, provider, period_end, ...)
  └── payments       (user_id, amount, currency, provider, status, ...)
```

## Flow

```
User clicks "Pay with Card"
  → /api/stripe/checkout    → Stripe hosted checkout
  → Payment succeeds
  → Stripe fires webhook    → /api/stripe/webhook
  → webhook calls upsert_subscription() in Supabase
  → user.isPremium = true   → AI Coach unlocked

User clicks "Pay via UPI"
  → /api/razorpay/order     → get order ID
  → Razorpay popup opens
  → Payment succeeds
  → Frontend calls /api/razorpay/verify
  → verify checks HMAC + calls upsert_subscription()
  → user.isPremium = true   → AI Coach unlocked
```
