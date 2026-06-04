import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const AMOUNTS = { premium: 99900, annual: 739900 };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).end();

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    userId,
    plan,
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
    return res.status(400).json({ error: "Missing payment fields" });

  // Verify HMAC signature
  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expected !== razorpay_signature)
    return res.status(400).json({ error: "Payment verification failed" });

  const now = new Date();
  const periodEnd = new Date(
    now.getTime() + (plan === "annual" ? 365 : 30) * 24 * 60 * 60 * 1000
  );

  try {
    await supabase.from("subscriptions").upsert(
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
      { onConflict: "user_id" }
    );

    await supabase.from("payments").insert({
      user_id:             userId,
      amount:              AMOUNTS[plan] ?? 0,
      currency:            "INR",
      provider:            "razorpay",
      provider_payment_id: razorpay_payment_id,
      provider_order_id:   razorpay_order_id,
      status:              "succeeded",
      metadata:            { plan },
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("[Razorpay verify] db error:", err);
    return res.status(500).json({ error: "Failed to save subscription" });
  }
}
