-- ============================================================
-- Migration 002: Subscriptions table
-- Run order: SECOND (after profiles)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan                     TEXT NOT NULL CHECK (plan IN ('premium', 'annual')),
  status                   TEXT NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'cancelled', 'expired')),
  provider                 TEXT CHECK (provider IN ('stripe', 'razorpay', 'manual')),
  provider_customer_id     TEXT,
  provider_subscription_id TEXT,
  current_period_start     TIMESTAMPTZ,
  current_period_end       TIMESTAMPTZ,
  cancel_at_period_end     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One active subscription per user (upsert key)
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_id_idx
  ON public.subscriptions (user_id);

DROP TRIGGER IF EXISTS set_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own subscription"       ON public.subscriptions;
DROP POLICY IF EXISTS "Service role full subscriptions"   ON public.subscriptions;

CREATE POLICY "Users read own subscription"
  ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full subscriptions"
  ON public.subscriptions FOR ALL USING (auth.role() = 'service_role');
