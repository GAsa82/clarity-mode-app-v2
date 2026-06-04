-- ============================================================
-- Migration 004: Helper functions
-- Run order: FOURTH
-- ============================================================

-- Returns TRUE if the given user has an active, non-expired subscription
CREATE OR REPLACE FUNCTION public.is_premium(uid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id            = uid
      AND status             IN ('active', 'trialing')
      AND current_period_end > NOW()
  );
$$;

-- Returns the current plan for a user ('free' | 'premium' | 'annual')
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

-- Upsert subscription helper — called by Edge Functions / webhooks
-- Replaces any existing subscription for the user
CREATE OR REPLACE FUNCTION public.upsert_subscription(
  p_user_id                  UUID,
  p_plan                     TEXT,
  p_status                   TEXT,
  p_provider                 TEXT,
  p_provider_customer_id     TEXT DEFAULT NULL,
  p_provider_subscription_id TEXT DEFAULT NULL,
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
    provider_customer_id     = COALESCE(EXCLUDED.provider_customer_id, subscriptions.provider_customer_id),
    provider_subscription_id = COALESCE(EXCLUDED.provider_subscription_id, subscriptions.provider_subscription_id),
    current_period_start     = EXCLUDED.current_period_start,
    current_period_end       = EXCLUDED.current_period_end,
    updated_at               = NOW()
  RETURNING * INTO result;

  RETURN result;
END;
$$;

-- Record a payment row
CREATE OR REPLACE FUNCTION public.record_payment(
  p_user_id            UUID,
  p_subscription_id    UUID DEFAULT NULL,
  p_amount             INTEGER DEFAULT 0,
  p_currency           TEXT DEFAULT 'usd',
  p_provider           TEXT DEFAULT 'stripe',
  p_provider_payment_id TEXT DEFAULT NULL,
  p_provider_order_id  TEXT DEFAULT NULL,
  p_status             TEXT DEFAULT 'succeeded',
  p_metadata           JSONB DEFAULT '{}'
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
  ) RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;
