import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Vercel: disable body parser so we get raw bytes for Stripe signature
export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", c => chunks.push(typeof c === "string" ? Buffer.from(c) : c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const rawBody = await getRawBody(req);
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[Stripe webhook] signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const obj = event.data.object;

  try {
    // ── Payment succeeded → activate subscription ──────────────
    if (event.type === "checkout.session.completed") {
      const { userId, plan } = obj.metadata || {};
      if (!userId) return res.json({ received: true });

      const sub = await stripe.subscriptions.retrieve(obj.subscription);

      await supabase.from("subscriptions").upsert(
        {
          user_id: userId,
          plan,
          status: "active",
          provider: "stripe",
          provider_customer_id: obj.customer,
          provider_subscription_id: obj.subscription,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end:   new Date(sub.current_period_end   * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "provider_subscription_id" }
      );

      await supabase.from("payments").insert({
        user_id:            userId,
        amount:             obj.amount_total,
        currency:           obj.currency,
        provider:           "stripe",
        provider_payment_id: obj.payment_intent,
        status:             "succeeded",
        metadata:           { plan, session_id: obj.id },
      });
    }

    // ── Subscription renewed / updated ─────────────────────────
    if (event.type === "customer.subscription.updated") {
      const { userId } = obj.metadata || {};
      if (userId) {
        await supabase.from("subscriptions").update({
          status:               obj.status === "active" ? "active" : obj.status,
          current_period_end:   new Date(obj.current_period_end * 1000).toISOString(),
          cancel_at_period_end: obj.cancel_at_period_end,
          updated_at:           new Date().toISOString(),
        }).eq("user_id", userId);
      }
    }

    // ── Subscription cancelled ──────────────────────────────────
    if (event.type === "customer.subscription.deleted") {
      const { userId } = obj.metadata || {};
      if (userId) {
        await supabase.from("subscriptions").update({
          status:     "cancelled",
          updated_at: new Date().toISOString(),
        }).eq("user_id", userId);
      }
    }

    // ── Payment failed → mark past_due ─────────────────────────
    if (event.type === "invoice.payment_failed") {
      const customerId = obj.customer;
      if (customerId) {
        await supabase.from("subscriptions").update({
          status:     "past_due",
          updated_at: new Date().toISOString(),
        }).eq("provider_customer_id", customerId);
      }
    }
  } catch (err) {
    console.error("[Stripe webhook] db error:", err);
  }

  return res.json({ received: true });
}
