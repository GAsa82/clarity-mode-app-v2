-- ============================================================
-- Migration 003: Payments table
-- Run order: THIRD (after subscriptions)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id      UUID REFERENCES public.subscriptions(id),
  amount               INTEGER NOT NULL,          -- smallest currency unit (cents / paise)
  currency             TEXT NOT NULL DEFAULT 'usd',
  provider             TEXT NOT NULL CHECK (provider IN ('stripe', 'razorpay')),
  provider_payment_id  TEXT,
  provider_order_id    TEXT,
  status               TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  metadata             JSONB NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payments_user_id_idx ON public.payments (user_id);
CREATE INDEX IF NOT EXISTS payments_status_idx  ON public.payments (status);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own payments"     ON public.payments;
DROP POLICY IF EXISTS "Service role full payments"  ON public.payments;

CREATE POLICY "Users read own payments"
  ON public.payments FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full payments"
  ON public.payments FOR ALL USING (auth.role() = 'service_role');
