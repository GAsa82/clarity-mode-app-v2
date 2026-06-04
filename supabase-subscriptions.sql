-- ============================================================
-- Clarity Mode — Subscription & Payment Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── subscriptions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan                    TEXT NOT NULL CHECK (plan IN ('premium', 'annual')),
  status                  TEXT NOT NULL CHECK (status IN ('active','cancelled','expired','trialing','past_due')),
  provider                TEXT CHECK (provider IN ('stripe','razorpay','manual')),
  provider_customer_id    TEXT,
  provider_subscription_id TEXT,
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  cancel_at_period_end    BOOLEAN DEFAULT FALSE,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ── payments ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription_id      UUID REFERENCES subscriptions(id),
  amount               INTEGER NOT NULL,
  currency             TEXT NOT NULL DEFAULT 'usd',
  provider             TEXT NOT NULL CHECK (provider IN ('stripe','razorpay')),
  provider_payment_id  TEXT,
  provider_order_id    TEXT,
  status               TEXT NOT NULL CHECK (status IN ('pending','succeeded','failed','refunded')),
  metadata             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments      ENABLE ROW LEVEL SECURITY;

-- Users can read their own data; only service_role can write
CREATE POLICY "Users read own subscriptions"
  ON subscriptions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full access subscriptions"
  ON subscriptions FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users read own payments"
  ON payments FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full access payments"
  ON payments FOR ALL USING (auth.role() = 'service_role');

-- ── Helper function ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_premium(uid UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM subscriptions
    WHERE user_id = uid
      AND status IN ('active','trialing')
      AND current_period_end > NOW()
  );
$$;
