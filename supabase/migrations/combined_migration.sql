-- ============================================================
-- Clarity Mode — Combined Migration
-- Run this once in: Supabase Dashboard → SQL Editor
-- ============================================================


-- ============================================================
-- SECTION 1: PROFILES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  name        TEXT,
  avatar_url  TEXT,
  role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Shared updated_at trigger function (used by all tables below)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create a profile row whenever a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own profile"      ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile"    ON public.profiles;
DROP POLICY IF EXISTS "Service role full profiles"  ON public.profiles;

CREATE POLICY "Users read own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Service role full profiles"
  ON public.profiles FOR ALL USING (auth.role() = 'service_role');

grant select, insert, update, delete on public.profiles to authenticated;


-- ============================================================
-- SECTION 2: SUBSCRIPTIONS
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

-- One active subscription row per user (upsert target)
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_id_idx
  ON public.subscriptions (user_id);

DROP TRIGGER IF EXISTS set_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own subscription"     ON public.subscriptions;
DROP POLICY IF EXISTS "Service role full subscriptions" ON public.subscriptions;

CREATE POLICY "Users read own subscription"
  ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full subscriptions"
  ON public.subscriptions FOR ALL USING (auth.role() = 'service_role');


-- ============================================================
-- SECTION 3: PAYMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id       UUID REFERENCES public.subscriptions(id),
  amount                INTEGER NOT NULL,
  currency              TEXT NOT NULL DEFAULT 'usd',
  provider              TEXT NOT NULL CHECK (provider IN ('stripe', 'razorpay')),
  provider_payment_id   TEXT,
  provider_order_id     TEXT,
  status                TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  metadata              JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payments_user_id_idx ON public.payments (user_id);
CREATE INDEX IF NOT EXISTS payments_status_idx  ON public.payments (status);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own payments"    ON public.payments;
DROP POLICY IF EXISTS "Service role full payments" ON public.payments;

CREATE POLICY "Users read own payments"
  ON public.payments FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full payments"
  ON public.payments FOR ALL USING (auth.role() = 'service_role');


-- ============================================================
-- SECTION 4: HELPER FUNCTIONS
-- ============================================================

-- Returns TRUE if the user has an active, non-expired subscription
CREATE OR REPLACE FUNCTION public.is_premium(uid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id            = uid
      AND status             IN ('active', 'trialing')
      AND current_period_end > NOW()
  );
$$;

-- Returns 'free' | 'premium' | 'annual' for the given user
CREATE OR REPLACE FUNCTION public.get_user_plan(uid UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (
      SELECT plan FROM public.subscriptions
      WHERE user_id            = uid
        AND status             IN ('active', 'trialing')
        AND current_period_end > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    ),
    'free'
  );
$$;

-- Upsert a subscription row — called by Stripe / Razorpay webhooks
CREATE OR REPLACE FUNCTION public.upsert_subscription(
  p_user_id                  UUID,
  p_plan                     TEXT,
  p_status                   TEXT,
  p_provider                 TEXT,
  p_provider_customer_id     TEXT        DEFAULT NULL,
  p_provider_subscription_id TEXT        DEFAULT NULL,
  p_period_start             TIMESTAMPTZ DEFAULT NOW(),
  p_period_end               TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
)
RETURNS public.subscriptions LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  result public.subscriptions;
BEGIN
  INSERT INTO public.subscriptions (
    user_id, plan, status, provider,
    provider_customer_id, provider_subscription_id,
    current_period_start, current_period_end,
    updated_at
  ) VALUES (
    p_user_id, p_plan, p_status, p_provider,
    p_provider_customer_id, p_provider_subscription_id,
    p_period_start, p_period_end,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan                     = EXCLUDED.plan,
    status                   = EXCLUDED.status,
    provider                 = EXCLUDED.provider,
    provider_customer_id     = COALESCE(EXCLUDED.provider_customer_id,     subscriptions.provider_customer_id),
    provider_subscription_id = COALESCE(EXCLUDED.provider_subscription_id, subscriptions.provider_subscription_id),
    current_period_start     = EXCLUDED.current_period_start,
    current_period_end       = EXCLUDED.current_period_end,
    updated_at               = NOW()
  RETURNING * INTO result;

  RETURN result;
END;
$$;

-- Insert a payment record — called by webhooks after successful charge
CREATE OR REPLACE FUNCTION public.record_payment(
  p_user_id             UUID,
  p_subscription_id     UUID        DEFAULT NULL,
  p_amount              INTEGER     DEFAULT 0,
  p_currency            TEXT        DEFAULT 'usd',
  p_provider            TEXT        DEFAULT 'stripe',
  p_provider_payment_id TEXT        DEFAULT NULL,
  p_provider_order_id   TEXT        DEFAULT NULL,
  p_status              TEXT        DEFAULT 'succeeded',
  p_metadata            JSONB       DEFAULT '{}'
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.payments (
    user_id, subscription_id, amount, currency,
    provider, provider_payment_id, provider_order_id,
    status, metadata
  ) VALUES (
    p_user_id, p_subscription_id, p_amount, p_currency,
    p_provider, p_provider_payment_id, p_provider_order_id,
    p_status, p_metadata
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;
