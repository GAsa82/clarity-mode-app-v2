import crypto from "crypto";
import Razorpay from "razorpay";
import { createClient } from "@supabase/supabase-js";
import { getVerifiedUserId } from "../_auth.js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const AMOUNTS = { premium: 99900, annual: 739900 };
const ORIGIN  = process.env.VITE_SITE_URL || "https://clarity-mode-app-v2-gq26.vercel.app";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).end();

  const userId = await getVerifiedUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
    return res.status(400).json({ error: "Missing payment fields" });

  // Verify HMAC signature
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expected !== razorpay_signature)
    return res.status(400).json({ error: "Payment verification failed" });

  // SECURITY: derive the plan from the order we created server-side — never
  // from the client. The signature proves the payment happened, but only the
  // order's own notes/amount prove WHAT was paid for. Trusting a client-sent
  // plan would let a ₹999 monthly payment activate a ₹7399 annual plan.
  let plan;
  try {
    const order = await razorpay.orders.fetch(razorpay_order_id);
    plan = order?.notes?.plan;
    if (!AMOUNTS[plan] || order.amount !== AMOUNTS[plan])
      return res.status(400).json({ error: "Order/plan mismatch" });
    if (order.notes?.userId && order.notes.userId !== userId)
      return res.status(403).json({ error: "Order belongs to a different account" });
  } catch (err) {
    console.error("[Razorpay verify] order fetch failed:", err?.error ?? err?.message ?? err);
    return res.status(500).json({ error: "Could not verify order" });
  }

  const now = new Date();
  const periodEnd = new Date(
    now.getTime() + (plan === "annual" ? 365 : 30) * 24 * 60 * 60 * 1000
  );

  try {
    const { error: subError } = await supabase.from("subscriptions").upsert(
      {
        user_id:                  userId,
        plan,
        status:                   "active",
        provider:                 "razorpay",
        provider_subscription_id: razorpay_payment_id,
        current_period_start:     now.toISOString(),
        current_period_end:       periodEnd.toISOString(),
        updated_at:               now.toISOString(),
      },
      { onConflict: "provider_subscription_id" }
    );
    if (subError) throw subError;

    const { error: payError } = await supabase.from("payments").insert({
      user_id:             userId,
      amount:              AMOUNTS[plan],
      currency:            "INR",
      provider:            "razorpay",
      provider_payment_id: razorpay_payment_id,
      provider_order_id:   razorpay_order_id,
      status:              "succeeded",
      metadata:            { plan },
    });
    // Payment log failure shouldn't block the customer's access — the
    // subscription row is already active. Log it for reconciliation.
    if (payError) console.error("[Razorpay verify] payment log failed:", payError);

    return res.json({ success: true });
  } catch (err) {
    console.error("[Razorpay verify] db error:", err);
    return res.status(500).json({ error: "Failed to save subscription" });
  }
}
