// Supabase Edge Function: stripe-webhook
// Deploy: supabase functions deploy stripe-webhook
// Stripe dashboard webhook URL: https://<project>.supabase.co/functions/v1/stripe-webhook

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-04-10",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!
    );
  } catch (err) {
    console.error("[stripe-webhook] signature error:", err);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const obj = event.data.object as any;

  try {
    // ── Payment succeeded → activate / create subscription ────
    if (event.type === "checkout.session.completed") {
      const { userId, plan } = obj.metadata ?? {};
      if (!userId) return new Response("ok");

      const sub = await stripe.subscriptions.retrieve(obj.subscription);

      await supabase.rpc("upsert_subscription", {
        p_user_id:                  userId,
        p_plan:                     plan,
        p_status:                   "active",
        p_provider:                 "stripe",
        p_provider_customer_id:     obj.customer,
        p_provider_subscription_id: obj.subscription,
        p_period_start:             new Date(sub.current_period_start * 1000).toISOString(),
        p_period_end:               new Date(sub.current_period_end   * 1000).toISOString(),
      });

      await supabase.rpc("record_payment", {
        p_user_id:             userId,
        p_amount:              obj.amount_total,
        p_currency:            obj.currency,
        p_provider:            "stripe",
        p_provider_payment_id: obj.payment_intent,
        p_status:              "succeeded",
        p_metadata:            { plan, session_id: obj.id },
      });
    }

    // ── Subscription renewed / updated ─────────────────────────
    if (event.type === "customer.subscription.updated") {
      const { userId } = obj.metadata ?? {};
      if (userId) {
        await supabase
          .from("subscriptions")
          .update({
            status:               obj.status === "active" ? "active" : obj.status,
            current_period_end:   new Date(obj.current_period_end * 1000).toISOString(),
            cancel_at_period_end: obj.cancel_at_period_end,
            updated_at:           new Date().toISOString(),
          })
          .eq("user_id", userId);
      }
    }

    // ── Subscription cancelled ──────────────────────────────────
    if (event.type === "customer.subscription.deleted") {
      const { userId } = obj.metadata ?? {};
      if (userId) {
        await supabase
          .from("subscriptions")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("user_id", userId);
      }
    }

    // ── Payment failed ──────────────────────────────────────────
    if (event.type === "invoice.payment_failed") {
      const customerId = obj.customer;
      await supabase
        .from("subscriptions")
        .update({ status: "past_due", updated_at: new Date().toISOString() })
        .eq("provider_customer_id", customerId);
    }
  } catch (err) {
    console.error("[stripe-webhook] db error:", err);
    return new Response("db error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
